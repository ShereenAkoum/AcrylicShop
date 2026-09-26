import { assetUrl } from '@/lib/assets';
import Image from 'next/image';
import { staff } from '@/lib/auth';
import { Title, Field } from '@/components/ui';
import { Upload } from '@/components/upload';
import { ActionForm } from '@/components/action-form';
import { editMedia, deleteMedia } from './actions';
export default async function Media({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { client } = await staff('media.view');
  const q = (await searchParams).q || '';
  let query = client.from('media').select('*').order('created_at', { ascending: false }).limit(100);
  if (q) query = query.ilike('title', `%${q.replace(/[%_]/g, '')}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (
    <>
      <Title title="Media Library" eyebrow="Public photography & website imagery" />
      <Upload bucket="website-media" />
      <form className="row section">
        <input
          className="control"
          style={{ maxWidth: 400 }}
          name="q"
          defaultValue={q}
          aria-label="Search media"
          placeholder="Search media titles"
        />
        <button className="button secondary">Search</button>
      </form>
      <div className="grid grid-3">
        {data?.map((m) => (
          <div className="card stack" key={m.id}>
            <div className="product-image">
              <Image src={assetUrl(m.url)} alt={m.alt} fill sizes="30vw" />
            </div>
            <h3>{m.title}</h3>
            <label className="field">
              Reusable image URL
              <input readOnly value={m.url} />
            </label>
            <details>
              <summary>Edit metadata</summary>
              <ActionForm action={editMedia}>
                <input type="hidden" name="id" value={m.id} />
                <Field label="Title" name="title" value={m.title} />
                <Field label="Alt text" name="alt" value={m.alt} />
                <Field label="Folder" name="folder" value={m.folder} />
              </ActionForm>
            </details>
            <ActionForm
              action={deleteMedia}
              label="Delete unused image"
              confirm="Permanently delete this image? Referenced images cannot be deleted."
            >
              <input type="hidden" name="id" value={m.id} />
            </ActionForm>
          </div>
        ))}
      </div>
    </>
  );
}
