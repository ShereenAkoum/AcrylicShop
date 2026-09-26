import { ResourceList } from '@/components/resource-editor';
import { Orders, Production, Inventory, Fulfillment } from '@/components/operations';
export default async function Module({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
    status?: string;
    sort?: string;
    view?: string;
  }>;
}) {
  const { module } = await params;
  const s = await searchParams;
  const page = Math.max(1, Number(s.page) || 1);
  if (module === 'orders') return <Orders {...s} page={page} />;
  if (module === 'production') return <Production view={s.view} />;
  if (module === 'inventory') return <Inventory />;
  if (module === 'payments' || module === 'deliveries') return <Fulfillment kind={module} />;
  return <ResourceList name={module} q={s.q} page={page} />;
}
