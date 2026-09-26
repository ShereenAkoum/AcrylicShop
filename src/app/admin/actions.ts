'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { staff, owner } from '@/lib/auth';
import { adminDb } from '@/lib/supabase/admin';
import { resources, formRecord } from '@/lib/resources';
import { usernameSchema, safeUrl } from '@/lib/domain';
import { documentSchema } from '@/lib/cms';
import type { Result } from '@/components/action-form';
function message(error: unknown) {
  return error instanceof z.ZodError
    ? error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    : error instanceof Error
      ? error.message
      : 'The operation failed. Please try again.';
}
function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
export async function saveResource(_: Result, form: FormData): Promise<Result> {
  try {
    const name = String(form.get('_resource'));
    const resource = resources[name];
    if (!resource) throw new Error('Unknown resource');
    const { client } = await staff(`${resource.permission}.edit`);
    const data = resource.schema.parse(formRecord(form, resource.fields)) as Record<
      string,
      unknown
    >;
    if (['categories', 'products'].includes(name) && !form.get('_id'))
      data.slug =
        String(data.title)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || `category-${crypto.randomUUID()}`;
    const id = z
      .uuid()
      .nullable()
      .parse(form.get('_id') || null);
    const result = id
      ? await client
          .from(resource.table)
          .update(data as Record<string, unknown>)
          .eq('id', id)
          .select('id')
          .single()
      : await client
          .from(resource.table)
          .insert(data as Record<string, unknown>)
          .select('id')
          .single();
    check(result.error);
    revalidatePath('/admin');
    revalidatePath('/', 'layout');
    return { success: 'Saved successfully.', href: `/admin/${name}/${result.data?.id}` };
  } catch (e) {
    return { error: message(e) };
  }
}
export async function saveVariant(_: Result, form: FormData): Promise<Result> {
  try {
    const { client } = await staff('products.edit');
    const data = z
      .object({
        product_id: z.uuid(),
        sku: z.string().min(1),
        color: z.string().min(1),
        size: z.string().min(1),
        stand: z.string().min(1),
        price_override: z.union([
          z.literal(''),
          z.coerce
            .number()
            .min(0)
            .max(1000000)
            .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001)
            .transform((v) => Math.round(v * 100)),
        ]),
        image_url: safeUrl,
        inventory_item_id: z.uuid(),
        active: z.boolean(),
      })
      .parse({ ...Object.fromEntries(form), active: form.get('active') === 'on' });
    check((await client.rpc('save_variant', { p_id: form.get('id') || null, p_data: data })).error);
    revalidatePath('/admin');
    return { success: 'Variant saved.' };
  } catch (e) {
    return { error: message(e) };
  }
}
export async function saveInventory(_: Result, form: FormData): Promise<Result> {
  try {
    const { client } = await staff('inventory.edit');
    const id = z.uuid().nullable().parse(form.get('id') || null);
    const data = z.object({ sku: z.string().min(1).max(100), title: z.string().min(1).max(200), quantity: z.coerce.number().int().min(0).max(100000), low_stock_threshold: z.coerce.number().int().min(0).max(100000) }).parse(Object.fromEntries(form));
    const result = id ? await client.from('inventory_items').update(data).eq('id', id) : await client.from('inventory_items').insert(data);
    check(result.error);
    revalidatePath('/admin/inventory');
    return { success: 'Inventory item saved.' };
  } catch (e) { return { error: message(e) }; }
}
export async function deleteInventory(id: string) {
  try {
    const { client } = await staff('inventory.edit');
    const { error } = await client.from('inventory_items').delete().eq('id', z.uuid().parse(id));
    if (error) return { error: error.code === '23503' ? 'This inventory item is used by a product variant.' : 'Unable to delete inventory item.' };
    revalidatePath('/admin/inventory');
    return { success: true };
  } catch { return { error: 'Unable to delete inventory item.' }; }
}
export async function operation(_: Result, form: FormData): Promise<Result> {
  try {
    const action = String(form.get('operation'));
    const mapping: Record<string, { permission: string; rpc: string; schema: z.ZodType }> = {
      production: {
        permission: 'production.edit',
        rpc: 'move_production',
        schema: z.object({ p_id: z.uuid(), p_stage: z.string() }),
      },
      inventory: {
        permission: 'inventory.edit',
        rpc: 'adjust_inventory',
        schema: z.object({
          p_id: z.uuid(),
          p_delta: z.coerce.number().int().min(-100000).max(100000),
          p_reason: z.string().min(3).max(500),
        }),
      },
      'create-inventory': {
        permission: 'inventory.edit',
        rpc: 'create_inventory',
        schema: z.object({
          p_sku: z.string().min(1),
          p_title: z.string().min(1),
          p_threshold: z.coerce.number().int().min(0),
        }),
      },
      payment: {
        permission: 'payments.edit',
        rpc: 'update_payment',
        schema: z.object({
          p_id: z.uuid(),
          p_status: z.enum(['Pending', 'Paid', 'Failed', 'Refunded', 'Partially Refunded']),
          p_reference: z.string().max(500),
          p_notes: z.string().max(5000),
        }),
      },
      delivery: {
        permission: 'deliveries.edit',
        rpc: 'update_delivery',
        schema: z.object({
          p_id: z.uuid(),
          p_status: z.enum([
            'Pending',
            'Assigned',
            'Out for Delivery',
            'Delivered',
            'Failed',
            'Returned',
          ]),
          p_courier: z.string().max(200),
          p_reference: z.string().max(500),
          p_notes: z.string().max(5000),
        }),
      },
      notes: {
        permission: 'orders.edit',
        rpc: 'update_order_notes',
        schema: z.object({ p_id: z.uuid(), p_notes: z.string().max(5000) }),
      },
    };
    const config = mapping[action];
    if (!config) throw new Error('Unknown action');
    const { client } = await staff(config.permission);
    const values = { ...Object.fromEntries(form) };
    const params = config.schema.parse(values);
    check((await client.rpc(config.rpc, params)).error);
    revalidatePath('/admin', 'layout');
    return { success: 'Updated successfully.' };
  } catch (e) {
    return { error: message(e) };
  }
}
export async function saveDocument(_: Result, form: FormData): Promise<Result> {
  try {
    const { client } = await staff('website.edit');
    const id = z.uuid().parse(form.get('id'));
    const draft = documentSchema.parse(JSON.parse(String(form.get('document'))));
    check((await client.from('website_documents').update({ draft }).eq('id', id)).error);
    revalidatePath('/admin/website');
    return { success: 'Draft saved. Preview it before publishing.' };
  } catch (e) {
    return { error: message(e) };
  }
}
export async function publishDocument(_: Result, form: FormData): Promise<Result> {
  try {
    const { client } = await staff('website.publish');
    check((await client.rpc('publish_document', { p_id: z.uuid().parse(form.get('id')) })).error);
    revalidatePath('/', 'layout');
    return { success: 'Published. The storefront now shows this version.' };
  } catch (e) {
    return { error: message(e) };
  }
}
export async function createDocument(_: Result, form: FormData): Promise<Result> {
  try {
    const { client } = await staff('website.edit');
    const key = z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .parse(form.get('key'));
    const title = z.string().min(1).parse(form.get('title'));
    check(
      (
        await client
          .from('website_documents')
          .insert({ key, title, draft: documentSchema.parse({ heading: title }) })
      ).error,
    );
    revalidatePath('/admin/website');
    return { success: 'Page created.' };
  } catch (e) {
    return { error: message(e) };
  }
}
export async function saveCollection(_: Result, form: FormData): Promise<Result> {
  try {
    const { client } = await staff('products.edit');
    const collection_id = z.uuid().parse(form.get('collection_id'));
    const product_id = z.uuid().parse(form.get('product_id'));
    check((await client.from('collection_products').upsert({ collection_id, product_id })).error);
    revalidatePath('/admin');
    return { success: 'Product added to collection.' };
  } catch (e) {
    return { error: message(e) };
  }
}
export async function createUser(_: Result, form: FormData): Promise<Result> {
  try {
    const session = await owner();
    const input = z
      .object({
        username: usernameSchema,
        full_name: z.string().min(2).max(120),
        password: z.string().min(12).max(128),
        confirm_password: z.string(),
        role_id: z.uuid(),
        email: z.union([z.email(), z.literal('')]),
        phone: z.string().max(40),
      })
      .refine((v) => v.password === v.confirm_password, 'Passwords must match')
      .parse(Object.fromEntries(form));
    const admin = adminDb();
    const { data: role, error: roleError } = await session.client
      .from('roles')
      .select('id')
      .eq('id', input.role_id)
      .single();
    check(roleError);
    if (!role) throw new Error('Role not found');
    const { data, error } = await admin.auth.admin.createUser({
      email: `${input.username}@staff.yaqeen.invalid`,
      password: input.password,
      email_confirm: true,
    });
    check(error);
    if (!data.user) throw new Error('User could not be created');
    const profile = await admin.from('profiles').insert({
      id: data.user.id,
      username: input.username,
      full_name: input.full_name,
      email: input.email || null,
      phone: input.phone || null,
    });
    if (profile.error) {
      await admin.auth.admin.deleteUser(data.user.id);
      throw new Error('Staff profile could not be created');
    }
    const assignment = await admin
      .from('user_roles')
      .insert({ user_id: data.user.id, role_id: input.role_id });
    if (assignment.error) {
      await admin.from('profiles').update({ active: false }).eq('id', data.user.id);
      throw new Error(
        'Account created but disabled: role assignment failed. Assign a role before activating.',
      );
    }
    check(
      (
        await admin.from('audit_logs').insert({
          actor: session.user.id,
          action: 'user.created',
          entity_type: 'profiles',
          entity_id: data.user.id,
        })
      ).error,
    );
    revalidatePath('/admin/users');
    return { success: 'Staff account created.' };
  } catch (e) {
    return { error: message(e) };
  }
}
export async function assignStaff(_: Result, form: FormData): Promise<Result> {
  try {
    const { client } = await owner();
    check(
      (
        await client.rpc('assign_staff', {
          p_id: z.uuid().parse(form.get('id')),
          p_role: z.uuid().parse(form.get('role_id')),
          p_active: form.get('active') === 'on',
        })
      ).error,
    );
    revalidatePath('/admin/users');
    return { success: 'Staff access updated.' };
  } catch (e) {
    return { error: message(e) };
  }
}
export async function resetPassword(_: Result, form: FormData): Promise<Result> {
  try {
    const session = await owner();
    const id = z.uuid().parse(form.get('id'));
    const password = z.string().min(12).max(128).parse(form.get('password'));
    const { data: roles } = await session.client
      .from('user_roles')
      .select('roles(is_owner)')
      .eq('user_id', id);
    if (roles?.some((r) => (r.roles as unknown as { is_owner: boolean })?.is_owner))
      throw new Error('Owner password changes use the trusted recovery procedure.');
    check((await adminDb().auth.admin.updateUserById(id, { password })).error);
    check(
      (
        await adminDb().from('audit_logs').insert({
          actor: session.user.id,
          action: 'user.password_reset',
          entity_type: 'profiles',
          entity_id: id,
        })
      ).error,
    );
    return { success: 'Password reset. Share it through a secure channel.' };
  } catch (e) {
    return { error: message(e) };
  }
}
export async function saveRole(_: Result, form: FormData): Promise<Result> {
  try {
    const { client } = await owner();
    check(
      (
        await client.rpc('save_role', {
          p_id: form.get('id') || null,
          p_name: z.string().min(2).max(100).parse(form.get('name')),
          p_permissions: form.getAll('permissions').map(String),
        })
      ).error,
    );
    revalidatePath('/admin/users');
    return { success: 'Role saved.' };
  } catch (e) {
    return { error: message(e) };
  }
}
export async function saveSettings(_: Result, form: FormData): Promise<Result> {
  try {
    const { client } = await staff('settings.edit');
    const value = z
      .object({
        currency: z.literal('USD'),
        delivery_fee: z.coerce.number().int().min(0).max(100000),
      })
      .parse(Object.fromEntries(form));
    check((await client.from('site_settings').update({ value }).eq('key', 'commerce')).error);
    revalidatePath('/admin/settings');
    return { success: 'Commerce settings saved.' };
  } catch (e) {
    return { error: message(e) };
  }
}
