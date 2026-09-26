'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserDb } from '@/lib/supabase/client';
export function Upload({ bucket, entityId }: { bucket: string; entityId?: string }) {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const router = useRouter();
  return (
    <form
      className="card stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const file = form.get('file');
        if (!(file instanceof File)) return;
        setPending(true);
        setMessage('');
        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bucket,
              entity_id: entityId,
              title: form.get('title'),
              folder: form.get('folder'),
              size: file.size,
              mime: file.type,
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          const client = browserDb();
          const upload = await client.storage
            .from(bucket)
            .uploadToSignedUrl(data.path, data.token, file, { contentType: file.type });
          if (upload.error) throw new Error(upload.error.message);
          const complete = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ complete: data.id }),
          });
          if (!complete.ok) throw new Error((await complete.json()).error);
          setMessage('Uploaded successfully.');
          router.refresh();
        } catch (e) {
          setMessage(e instanceof Error ? e.message : 'Upload failed');
        } finally {
          setPending(false);
        }
      }}
    >
      <label className="field">
        {bucket === 'production-files'
          ? 'Private production file (PDF, PNG, TIFF, ZIP; up to 50 MB)'
          : 'Public image (JPG, PNG, WebP; up to 10 MB)'}
        <input
          type="file"
          name="file"
          required
          accept={
            bucket === 'production-files'
              ? '.pdf,.png,.tiff,.zip'
              : 'image/jpeg,image/png,image/webp'
          }
        />
      </label>
      <label className="field">
        Title / descriptive alt text
        <input name="title" required maxLength={300} />
      </label>
      <label className="field">
        Folder
        <input name="folder" maxLength={100} />
      </label>
      {message && (
        <p role="status" style={{ overflowWrap: 'anywhere' }}>
          {message}
        </p>
      )}
      <button className="button" disabled={pending}>
        {pending ? 'Uploading…' : 'Upload'}
      </button>
    </form>
  );
}
