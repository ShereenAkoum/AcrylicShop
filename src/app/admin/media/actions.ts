'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { staff } from '@/lib/auth';
import type { Result } from '@/components/action-form';
export async function editMedia(_: Result, form: FormData): Promise<Result> {
  try {
    const { client } = await staff('media.edit');
    const id = z.uuid().parse(form.get('id'));
    const data = z
      .object({
        title: z.string().min(1).max(300),
        alt: z.string().max(500),
        folder: z.string().max(100),
      })
      .parse(Object.fromEntries(form));
    const { error } = await client.from('media').update(data).eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/admin/media');
    return { success: 'Media details saved.' };
  } catch {
    return { error: 'Media update failed. Check your permissions and details.' };
  }
}
export async function deleteMedia(_: Result, form: FormData): Promise<Result> {
  try {
    const { client } = await staff('media.edit');
    const id = z.uuid().parse(form.get('id'));
    const { data: media, error } = await client.from('media').select('*').eq('id', id).single();
    if (error) throw error;
    const { data: inUse, error: usageError } = await client.rpc('media_in_use', {
      p_url: media.url,
    });
    if (usageError || inUse)
      return {
        error:
          'This image is in use or usage could not be verified. Remove references before deleting.',
      };
    const removed = await client.storage.from(media.bucket).remove([media.path]);
    if (removed.error) throw removed.error;
    const deleted = await client.from('media').delete().eq('id', id);
    if (deleted.error) throw deleted.error;
    revalidatePath('/admin/media');
    return { success: 'Unused media deleted.' };
  } catch {
    return { error: 'Media could not be deleted.' };
  }
}
