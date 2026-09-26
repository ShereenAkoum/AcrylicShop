import { ResourceEditor } from '@/components/resource-editor';
import { OrderDetail } from '@/components/operations';
export default async function Editor({
  params,
}: {
  params: Promise<{ module: string; id: string }>;
}) {
  const { module, id } = await params;
  return module === 'orders' ? <OrderDetail id={id} /> : <ResourceEditor name={module} id={id} />;
}
