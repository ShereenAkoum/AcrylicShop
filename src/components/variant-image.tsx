'use client';
import { useState } from 'react';
import Image from 'next/image';
import { browserDb } from '@/lib/supabase/client';
import { assetUrl } from '@/lib/assets';
export function VariantImage({
  initialUrl = '',
  fieldName = 'image_url',
}: {
  initialUrl?: string;
  fieldName?: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="stack">
      <input type="hidden" name={fieldName} value={url} />
      {url && (
        <>
          <a href={assetUrl(url)} target="_blank" rel="noreferrer" aria-label="View image">
            <Image
              src={assetUrl(url)}
              alt="Image"
              width={240}
              height={170}
              style={{ objectFit: 'contain' }}
            />
          </a>
          <button
            type="button"
            className="button secondary"
            disabled={pending}
            onClick={() => setUrl('')}
          >
            Delete image
          </button>
        </>
      )}
      <label className="field">
        {url ? 'Replace variant image' : 'Upload variant image'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-disabled={pending}
          onChange={async (e) => {
            if (pending) return;
            const input = e.currentTarget;
            const file = input.files?.[0];
            if (!file) return;
            input.setCustomValidity('Wait for the image upload to finish.');
            setPending(true);
            setError('');
            try {
              const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  bucket: 'product-images',
                  title: file.name,
                  size: file.size,
                  mime: file.type,
                }),
              });
              const intent = await response.json();
              if (!response.ok) throw new Error(intent.error);
              const client = browserDb();
              const { error } = await client.storage
                .from('product-images')
                .uploadToSignedUrl(intent.path, intent.token, file, { contentType: file.type });
              if (error) throw new Error('Upload failed. Please retry.');
              const complete = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ complete: intent.id }),
              });
              if (!complete.ok) throw new Error('Could not finish upload.');
              setUrl(
                client.storage.from('product-images').getPublicUrl(intent.path).data.publicUrl,
              );
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Upload failed.');
            } finally {
              input.setCustomValidity('');
              input.value = '';
              setPending(false);
            }
          }}
        />
      </label>
      <p className="small muted">{pending ? 'Uploading image…' : 'Save to apply image changes.'}</p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
