import { NextResponse } from 'next/server';
import { z } from 'zod';
import { staff } from '@/lib/auth';
import { sameOrigin } from '@/lib/http';
const inputSchema = z.object({
  bucket: z.enum(['product-images', 'website-media', 'design-previews', 'production-files']),
  mime: z.string(),
  size: z.number().int().positive(),
  title: z.string().min(1).max(300),
  folder: z.string().max(100).default(''),
  entity_id: z.uuid().optional(),
});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await request.json();
    if (body.complete) {
      const { client } = await staff();
      const id = z.uuid().parse(body.complete);
      const { error } = await client.rpc('complete_upload', { p_id: id });
      if (error) throw new Error('Upload could not be finalized. Check permissions and try again.');
      return NextResponse.json({ ok: true });
    }
    const input = inputSchema.parse(body);
    const privateFile = input.bucket === 'production-files';
    const { client, user } = await staff(privateFile ? 'designs.edit' : 'media.edit');
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      ...(privateFile
        ? { 'application/pdf': 'pdf', 'image/tiff': 'tiff', 'application/zip': 'zip' }
        : {}),
    };
    const ext = extensions[input.mime];
    if (!ext || input.size > (privateFile ? 50 : 10) * 1024 * 1024)
      throw new Error('Invalid file type or size');
    if (privateFile && !input.entity_id) throw new Error('A design is required');
    if (input.bucket === 'product-images' && input.entity_id) {
      const { data } = await client.rpc('has_permission', { p_key: 'products.edit' });
      if (!data) throw new Error('Product edit permission required');
    }
    const path = `${crypto.randomUUID()}.${ext}`;
    const { data: intent, error } = await client
      .from('upload_requests')
      .insert({
        actor: user.id,
        bucket: input.bucket,
        path,
        title: input.title,
        folder: input.folder,
        entity_id: input.entity_id || null,
      })
      .select('id')
      .single();
    if (error) throw new Error('Unable to prepare upload');
    const signed = await client.storage.from(input.bucket).createSignedUploadUrl(path);
    if (signed.error) throw new Error('Unable to authorize upload');
    return NextResponse.json(
      { id: intent.id, path, token: signed.data.token },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Upload failed' },
      { status: 400 },
    );
  }
}
