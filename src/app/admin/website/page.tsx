import Link from 'next/link';
import { staff } from '@/lib/auth';
import { Title, Field } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { createDocument } from '@/app/admin/actions';
export default async function Website() {
  const { client } = await staff('website.view');
  const { data, error } = await client
    .from('website_documents')
    .select('id,key,title,published_at')
    .order('key');
  if (error) throw new Error(error.message);
  return (
    <>
      <Title title="Website" eyebrow="Your story, thoughtfully told" />
      <div className="grid grid-3">
        {data?.map((d) => (
          <Link className="card" key={d.id} href={`/admin/website/edit/${d.key}`}>
            <h2>{d.title} ↗</h2>
            <p className="small muted">
              {d.published_at
                ? 'Published · ' + new Date(d.published_at).toLocaleDateString()
                : 'Draft only'}
            </p>
            <span className="badge">{d.key}</span>
          </Link>
        ))}
      </div>
      <div className="card section" style={{ marginTop: 32 }}>
        <h2>Create a page</h2>
        <ActionForm action={createDocument} label="Create page">
          <Field name="title" label="Page title" required />
          <Field name="key" label="Page URL slug" required />
        </ActionForm>
      </div>
    </>
  );
}
