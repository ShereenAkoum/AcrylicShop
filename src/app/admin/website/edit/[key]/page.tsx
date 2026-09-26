import { notFound } from 'next/navigation';
import { staff } from '@/lib/auth';
import { documentSchema } from '@/lib/cms';
import { CmsEditor } from '@/components/cms-editor';
import { Title } from '@/components/ui';
export default async function Edit({ params }: { params: Promise<{ key: string }> }) {
  const { client, permissions } = await staff('website.edit');
  const { key } = await params;
  const { data, error } = await client
    .from('website_documents')
    .select('*')
    .eq('key', key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) notFound();
  const [products, collections] = await Promise.all([
    client.from('products').select('id,title').limit(500),
    client.from('collections').select('id,title').limit(500),
  ]);
  return (
    <>
      <Title title={data.title} eyebrow="Website editor" />
      <CmsEditor
        id={data.id}
        documentKey={key}
        initial={documentSchema.parse(data.draft)}
        canPublish={permissions.includes('website.publish')}
        products={products.data || []}
        collections={collections.data || []}
      />
    </>
  );
}
