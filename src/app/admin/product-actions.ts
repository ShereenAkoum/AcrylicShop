'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { staff } from '@/lib/auth';
export async function deleteProduct(id: string) {
  const { client } = await staff('products.edit');
  const { error } = await client
    .from('products')
    .delete()
    .eq('id', z.uuid().parse(id))
    .select('id')
    .single();
  if (error)
    return {
      error:
        error.code === '23503'
          ? 'This product has order or inventory history. Archive it instead to preserve those records.'
          : 'Unable to delete this product.',
    };
  revalidatePath('/admin/products');
  revalidatePath('/');
  return { success: true };
}

export async function setProductActive(id: string, active: boolean) {
  const { client } = await staff('products.edit');
  const { error } = await client
    .from('products')
    .update({ status: z.boolean().parse(active) ? 'Active' : 'Draft' })
    .eq('id', z.uuid().parse(id))
    .select('id')
    .single();
  if (error) return { error: 'Unable to change product visibility.' };
  revalidatePath('/admin/products');
  revalidatePath('/');
  return { success: true };
}

export async function deleteVariant(id: string) {
  const { client } = await staff('products.edit');
  const { error } = await client
    .from('product_variants')
    .delete()
    .eq('id', z.uuid().parse(id))
    .select('id')
    .single();
  if (error)
    return {
      error:
        error.code === '23503'
          ? 'This variant has order or inventory history. Turn it inactive instead.'
          : 'Unable to delete variant.',
    };
  revalidatePath('/admin/products');
  revalidatePath('/');
  return { success: true };
}
