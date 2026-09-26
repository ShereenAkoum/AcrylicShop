'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { staff } from '@/lib/auth';
export async function categoryAction(id: string, action: 'toggle' | 'delete', active: boolean) {
  const { client } = await staff('products.edit');
  const parsed = z
    .object({ id: z.uuid(), action: z.enum(['toggle', 'delete']), active: z.boolean() })
    .parse({ id, action, active });
  const query =
    parsed.action === 'delete'
      ? client.from('categories').delete()
      : client.from('categories').update({ active: parsed.active });
  const { error } = await query.eq('id', parsed.id).select('id').single();
  if (error) return { error: 'Unable to update this category. Please try again.' };
  revalidatePath('/', 'layout');
  return { success: true };
}
