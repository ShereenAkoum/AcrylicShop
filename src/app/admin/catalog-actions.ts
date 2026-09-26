'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { staff } from '@/lib/auth';
import { safeUrl } from '@/lib/domain';
import type { Result } from '@/components/action-form';
export async function productImage(_: Result, form: FormData): Promise<Result> {
  try {
    const { client } = await staff('products.edit');
    const id = z
      .uuid()
      .nullable()
      .parse(form.get('id') || null);
    if (form.get('remove') === 'true') {
      if (!id) throw new Error('Missing image');
      const { error } = await client.from('product_images').delete().eq('id', id);
      if (error) throw error;
    } else {
      const data = z
        .object({
          product_id: z.uuid(),
          url: safeUrl.refine((v) => v.length > 0),
          alt: z.string().max(500),
          position: z.coerce.number().int().min(0).max(100),
        })
        .parse(Object.fromEntries(form));
      const result = id
        ? await client.from('product_images').update(data).eq('id', id)
        : await client.from('product_images').insert(data);
      if (result.error) throw result.error;
    }
    revalidatePath('/admin', 'layout');
    return { success: 'Product image updated.' };
  } catch {
    return { error: 'Image update failed. Check the fields and your permissions.' };
  }
}
export async function removeCollectionProduct(_: Result, form: FormData): Promise<Result> {
  try {
    const { client } = await staff('products.edit');
    const collection = z.uuid().parse(form.get('collection_id'));
    const product = z.uuid().parse(form.get('product_id'));
    const { error } = await client
      .from('collection_products')
      .delete()
      .eq('collection_id', collection)
      .eq('product_id', product);
    if (error) throw error;
    revalidatePath('/admin', 'layout');
    return { success: 'Removed from collection.' };
  } catch {
    return { error: 'Unable to remove product.' };
  }
}
export async function customerAddress(_: Result, form: FormData): Promise<Result> {
  try {
    const { client } = await staff('customers.edit');
    const id = z
      .uuid()
      .nullable()
      .parse(form.get('id') || null);
    const data = z
      .object({
        customer_id: z.uuid(),
        address: z.string().min(5).max(500),
        city: z.string().min(2).max(120),
      })
      .parse(Object.fromEntries(form));
    const result = id
      ? await client.from('customer_addresses').update(data).eq('id', id)
      : await client.from('customer_addresses').insert(data);
    if (result.error) throw result.error;
    revalidatePath('/admin', 'layout');
    return { success: 'Address saved.' };
  } catch {
    return { error: 'Unable to save address.' };
  }
}
export async function unpublishDocument(_: Result, form: FormData): Promise<Result> {
  try {
    const { client } = await staff('website.publish');
    const { error } = await client.rpc('unpublish_document', {
      p_id: z.uuid().parse(form.get('id')),
    });
    if (error) throw error;
    revalidatePath('/', 'layout');
    return { success: 'Unpublished. Your draft is preserved.' };
  } catch {
    return { error: 'Unpublish failed.' };
  }
}
