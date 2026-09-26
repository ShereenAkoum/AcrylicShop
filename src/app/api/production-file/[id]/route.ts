import { NextResponse } from 'next/server';
import { z } from 'zod';
import { staff } from '@/lib/auth';
import { adminDb } from '@/lib/supabase/admin';
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await staff('download_production_files');
    const id = z.uuid().parse((await params).id);
    const { data: path, error } = await client.rpc('authorize_download', { p_id: id });
    if (error || !path) throw new Error('Forbidden');
    const { data, error: signError } = await adminDb()
      .storage.from('production-files')
      .createSignedUrl(path, 60, { download: true });
    if (signError || !data) throw new Error('File unavailable');
    return NextResponse.redirect(data.signedUrl, {
      headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' },
    });
  } catch {
    return NextResponse.json({ error: 'File unavailable or access denied.' }, { status: 403 });
  }
}
