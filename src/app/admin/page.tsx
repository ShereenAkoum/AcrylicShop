import Link from 'next/link';
import { staff } from '@/lib/auth';
import { Title } from '@/components/ui';
import { DataTable } from '@/components/operations';
import { money } from '@/lib/domain';
export default async function Dashboard() {
  const { client, permissions } = await staff();
  const { data: orders } = permissions.includes('orders.view')
    ? await client
        .from('orders')
        .select('id,number,customer_name,total,status,created_at')
        .order('created_at', { ascending: false })
        .limit(8)
    : { data: [] };
  const { data: stats } = await client.rpc('dashboard_stats');
  const values = stats || {};
  const { data: inventory } = permissions.includes('inventory.view')
    ? await client
        .from('inventory_items')
        .select('sku,title,quantity,low_stock_threshold')
        .order('quantity')
        .limit(20)
    : { data: [] };
  return (
    <>
      <Title
        title="A meaningful day starts here."
        eyebrow={new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
      />
      <div className="grid grid-3">
        {[
          ['New orders', values.new_orders],
          ['To print', values.to_print],
          ['Ready to pack', values.ready_to_pack],
          ['Out for delivery', values.out_for_delivery],
          ['Collected revenue', values.revenue === undefined ? undefined : money(values.revenue)],
          ['Low stock', values.low_stock],
        ]
          .filter(([, value]) => value !== undefined)
          .map(([label, value]) => (
            <div className="card" key={label}>
              <p className="eyebrow">{label}</p>
              <div className="metric">{value}</div>
            </div>
          ))}
      </div>
      <section className="section stack">
        <div className="row between">
          <h2>Recent orders</h2>
          {permissions.includes('orders.view') && <Link href="/admin/orders">View all →</Link>}
        </div>
        <DataTable
          rows={(orders || []).map((o) => ({ ...o, total: money(o.total) }))}
          columns={['number', 'customer_name', 'total', 'status']}
          link="/admin/orders"
        />
      </section>
      {permissions.includes('inventory.view') && (
        <div className="card">
          <h2>Inventory attention</h2>
          {inventory
            ?.filter((i) => i.quantity <= i.low_stock_threshold)
            .map((i) => (
              <p key={i.sku}>
                {i.title} <span className="badge">{i.quantity} remaining</span>
              </p>
            ))}
          <Link href="/admin/inventory">Manage inventory →</Link>
        </div>
      )}
    </>
  );
}
