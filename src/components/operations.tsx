import { AddPopup } from './add-popup';
import Image from 'next/image';
import { assetUrl } from '@/lib/assets';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { staff } from '@/lib/auth';
import { money, stages } from '@/lib/domain';
import { ActionForm } from './action-form';
import { Field, Title, Empty } from './ui';
import { operation, saveInventory } from '@/app/admin/actions';
import { InventoryTable } from './inventory-table';
type Row = Record<string, unknown>;
export function DataTable({
  rows,
  columns,
  link,
}: {
  rows: Row[];
  columns: string[];
  link?: string;
}) {
  if (!rows.length) return <Empty>No records yet.</Empty>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c.replaceAll('_', ' ')}</th>
            ))}
            {link && <th className="actions-cell">Details</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={String(r.id || i)}>
              {columns.map((c) => (
                <td key={c}>
                  {typeof r[c] === 'object' ? JSON.stringify(r[c]) : String(r[c] ?? '—')}
                </td>
              ))}
              {link && (
                <td className="actions-cell">
                  <Link href={`${link}/${r.id}`}>Open →</Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export async function Orders({
  q = '',
  page = 1,
  status = '',
  sort = 'newest',
}: {
  q?: string;
  page?: number;
  status?: string;
  sort?: string;
}) {
  const { client } = await staff('orders.view');
  let query = client
    .from('orders')
    .select('id,number,customer_name,total,currency,status,created_at', { count: 'exact' })
    .order('created_at', { ascending: sort === 'oldest' });
  if (q) query = query.ilike('number', `%${q.replace(/[^a-z0-9-]/gi, '')}%`);
  if (status) query = query.eq('status', status);
  const { data, error, count } = await query.range((page - 1) * 25, page * 25 - 1);
  if (error) throw new Error(error.message);
  return (
    <>
      <Title title="Orders" eyebrow="Every order, a little intention" />
      <form className="row" style={{ marginBottom: 20 }}>
        <input
          className="control"
          style={{ maxWidth: 240 }}
          name="q"
          defaultValue={q}
          aria-label="Order number"
          placeholder="Search order number"
        />
        <select
          className="control"
          style={{ maxWidth: 200 }}
          name="status"
          defaultValue={status}
          aria-label="Status"
        >
          <option value="">All statuses</option>
          {['Order Received', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          name="sort"
          className="control"
          style={{ maxWidth: 160 }}
          defaultValue={sort}
          aria-label="Sort"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <button className="button secondary">Filter</button>
      </form>
      <DataTable
        rows={(data || []).map((o) => ({ ...o, total: money(o.total, o.currency) }))}
        columns={['number', 'customer_name', 'total', 'status', 'created_at']}
        link="/admin/orders"
      />
      <div className="row section">
        <span>{count || 0} orders</span>
        {page > 1 && (
          <Link
            href={`?page=${page - 1}&q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&sort=${sort}`}
          >
            Previous
          </Link>
        )}
        {(count || 0) > page * 25 && (
          <Link
            href={`?page=${page + 1}&q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&sort=${sort}`}
          >
            Next
          </Link>
        )}
      </div>
    </>
  );
}
export async function OrderDetail({ id }: { id: string }) {
  const { client, permissions } = await staff('orders.view');
  const { data: o, error } = await client
    .from('orders')
    .select('*,order_items(*),order_status_history(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!o) notFound();
  return (
    <>
      <Title title={o.number}>
        <span className="badge">{o.status}</span>
      </Title>
      <div className="grid grid-2">
        <div className="card">
          <h2>{o.customer_name}</h2>
          <p>
            {o.phone} · {o.email}
          </p>
          <p>
            {o.address}
            <br />
            {o.city}
          </p>
          <p>{o.instructions}</p>
        </div>
        <div className="card">
          <p>Subtotal: {money(o.subtotal, o.currency)}</p>
          <p>Delivery: {money(o.delivery_fee, o.currency)}</p>
          <p>Discount: {money(o.discount, o.currency)}</p>
          <h2>Total: {money(o.total, o.currency)}</h2>
        </div>
      </div>
      <section className="section">
        <h2>Order items</h2>
        <DataTable
          rows={o.order_items}
          columns={['title', 'sku', 'color', 'size', 'stand', 'quantity', 'unit_price']}
        />
      </section>
      <div className="grid grid-2">
        <div className="card">
          <h2>Status history</h2>
          {o.order_status_history.map((h: { id: string; status: string; created_at: string }) => (
            <p key={h.id}>
              {h.status} <span className="small muted">{h.created_at}</span>
            </p>
          ))}
        </div>
        {permissions.includes('orders.edit') && (
          <div className="card">
            <ActionForm action={operation}>
              <input name="operation" type="hidden" value="notes" />
              <input name="p_id" type="hidden" value={id} />
              <Field name="p_notes" label="Internal order notes">
                <textarea name="p_notes" defaultValue={o.notes} />
              </Field>
            </ActionForm>
          </div>
        )}
      </div>
    </>
  );
}
export async function Production({ view = 'board' }: { view?: string }) {
  const { client, permissions } = await staff('production.view');
  const result = await client.rpc('production_board');
  if (result.error) throw new Error(result.error.message);
  const data = result.data as {
    id: string;
    stage: string;
    created_at: string;
    order_number: string;
    title: string;
    sku: string;
    color: string;
    size: string;
    stand: string;
    quantity: number;
    image_url: string | null;
    design_code: string | null;
    customer_name: string | null;
    payment_status: string | null;
  }[];
  return (
    <>
      <Title title="Production" eyebrow="Made with care">
        <Link className="button secondary" href={`?view=${view === 'board' ? 'list' : 'board'}`}>
          {view === 'board' ? 'List view' : 'Board view'}
        </Link>
      </Title>
      <p className="muted small">
        Oldest 250 jobs. Move one stage at a time; every move is recorded. Customer details require
        customer access.
      </p>
      {view === 'list' ? (
        <DataTable
          rows={(data || []).map((j) => ({
            ...j,
            product: j.title,
            order: j.order_number,
          }))}
          columns={['order', 'product', 'stage', 'created_at']}
        />
      ) : (
        <div className="board">
          {stages.map((stage, index) => (
            <section className="lane" key={stage}>
              <div className="row between">
                <strong>{stage}</strong>
                <span className="badge">{data?.filter((j) => j.stage === stage).length || 0}</span>
              </div>
              {data
                ?.filter((j) => j.stage === stage)
                .map((j) => (
                  <article className="card stack" key={j.id}>
                    <span className="eyebrow">{j.order_number || j.id.slice(0, 8)}</span>
                    <span className="small muted">
                      {j.design_code || 'No design assigned'}{' '}
                      {j.payment_status && `? ${j.payment_status}`}
                    </span>
                    {j.image_url && (
                      <Image src={assetUrl(j.image_url)} alt={j.title} width={220} height={150} />
                    )}
                    <strong>{j.title || 'Production item'}</strong>
                    <span className="small muted">
                      {j.color} · {j.size} · {j.stand} × {j.quantity}
                    </span>
                    {j.customer_name && <span className="small">{j.customer_name}</span>}
                    {permissions.includes('production.edit') && (
                      <ActionForm action={operation} label="Move">
                        <input type="hidden" name="operation" value="production" />
                        <input type="hidden" name="p_id" value={j.id} />
                        <label className="field">
                          Next stage
                          <select name="p_stage">
                            {stages
                              .filter((_, i) => Math.abs(i - index) === 1)
                              .map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                          </select>
                        </label>
                      </ActionForm>
                    )}
                  </article>
                ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
export async function Inventory() {
  const { client, permissions } = await staff('inventory.view');
  const [itemsResult, variantsResult, historyResult] = await Promise.all([
    client.from('inventory_items').select('id,sku,title,quantity,low_stock_threshold').order('title').limit(200),
    client.from('product_variants').select('id,sku,color,stock_allocation,active,inventory_item_id,products(title)').order('sku').limit(500),
    client.from('inventory_movements').select('id,created_at,delta,allocation_delta,movement_type,reason,order_number,product_title,variant_sku,inventory_items(sku,title),profiles(full_name)').order('created_at', { ascending: false }).limit(50),
  ]);
  if (itemsResult.error) throw new Error(itemsResult.error.message);
  if (variantsResult.error) throw new Error(variantsResult.error.message);
  if (historyResult.error) throw new Error(historyResult.error.message);
  const items = itemsResult.data || [];
  const variants = variantsResult.data || [];
  const history = historyResult.data || [];
  const allocationByItem = new Map<string, number>();
  for (const variant of variants) allocationByItem.set(variant.inventory_item_id, (allocationByItem.get(variant.inventory_item_id) || 0) + variant.stock_allocation);
  const inventoryFlow = (items).map((item) => {
    const allocated = allocationByItem.get(item.id) || 0;
    return {
      inventory_item: `${item.title} (${item.sku})`,
      physical: item.quantity,
      allocated,
      unallocated: Math.max(0, item.quantity - allocated),
      status: item.quantity <= item.low_stock_threshold ? 'Low stock' : allocated >= item.quantity ? 'Fully allocated' : 'Available',
    };
  });
  const allocations = (variants).map((variant) => {
    const product = variant.products as unknown as { title: string } | null;
    const item = (items).find((row) => row.id === variant.inventory_item_id);
    return {
      product: product?.title || 'Product',
      variant: `${variant.sku} — ${variant.color}`,
      inventory_item: item?.title || 'Not assigned',
      allocated: variant.stock_allocation,
      storefront: variant.active && variant.stock_allocation > 0 && (item?.quantity || 0) > 0 ? 'Visible' : 'Out of stock',
    };
  });
  const movements = (history).map((movement) => {
    const item = movement.inventory_items as unknown as { sku: string; title: string } | null;
    const profile = movement.profiles as unknown as { full_name: string } | null;
    return {
      created_at: new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(movement.created_at)),
      inventory_item: item ? `${item.title} (${item.sku})` : 'Inventory item',
      movement: movement.movement_type === 'Allocation' ? `${movement.allocation_delta! > 0 ? '+' : ''}${movement.allocation_delta} allocated` : movement.delta > 0 ? `+${movement.delta} received` : `${movement.delta} used`,
      type: movement.movement_type,
      source: movement.order_number
        ? `${movement.order_number}${movement.product_title ? ` — ${movement.product_title}` : ''}${movement.variant_sku ? ` (${movement.variant_sku})` : ''}`
        : movement.reason,
      by: profile?.full_name || (movement.movement_type === 'Sale' ? 'Online store' : 'System'),
    };
  });
  const editable = permissions.includes('inventory.edit');
  const editor = (item: { id: string; sku: string; title: string; quantity: number; low_stock_threshold: number } | null) => (
    <div className="card">
      <ActionForm action={saveInventory}>
        <input type="hidden" name="id" value={item?.id || ''} />
        <Field name="sku" label="SKU" value={item?.sku || ''} required />
        <Field name="title" label="Inventory item" value={item?.title || ''} required />
        <Field name="quantity" label="Quantity" type="number" value={item?.quantity ?? 0} required />
        <Field name="low_stock_threshold" label="Low-stock threshold" type="number" value={item?.low_stock_threshold ?? 5} required />
      </ActionForm>
    </div>
  );
  return <>
    <Title title="Inventory" eyebrow="Physical acrylic stock">
      {editable && <div className="row">
        <AddPopup title="Adjust stock">
          <ActionForm action={operation} confirm="Record this inventory adjustment? Negative quantities reduce available stock.">
            <input name="operation" type="hidden" value="inventory" />
            <Field name="p_id" label="Inventory item"><select name="p_id">{items?.map(i => <option key={i.id} value={i.id}>{i.sku} — {i.title}</option>)}</select></Field>
            <Field name="p_delta" label="Change (+ received / − used)" type="number" required />
            <Field name="p_reason" label="Reason" required />
          </ActionForm>
        </AddPopup>
        <AddPopup title="Add inventory item">{editor(null)}</AddPopup>
      </div>}
    </Title>
    <InventoryTable rows={items} editable={editable} editors={(items).map(editor)} />
    <section className="section">
      <h2>Inventory flow</h2>
      <p className="muted small">Physical is what you own. Allocated is assigned across product variants. Unallocated is still available to assign.</p>
      <DataTable rows={inventoryFlow} columns={['inventory_item','physical','allocated','unallocated','status']} />
    </section>
    <section className="section">
      <h2>Product allocations</h2>
      <p className="muted small">See exactly how each physical inventory pool is distributed across products.</p>
      <DataTable rows={allocations} columns={['product','variant','inventory_item','allocated','storefront']} />
    </section>
    <section className="section"><h2>Recent movements</h2><p className="muted small">Every receipt, manual adjustment, and completed sale is recorded here.</p><DataTable rows={movements} columns={['created_at','inventory_item','movement','type','source','by']} /></section>
  </>;
}
export async function Fulfillment({ kind }: { kind: 'payments' | 'deliveries' }) {
  const { client, permissions } = await staff(`${kind}.view`);
  const { data, error } = await client
    .from(kind)
    .select('*,orders(number,customer_name,phone,address,city)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  const payment = kind === 'payments';
  const statuses = payment
    ? ['Pending', 'Paid', 'Failed', 'Refunded', 'Partially Refunded']
    : ['Pending', 'Assigned', 'Out for Delivery', 'Delivered', 'Failed', 'Returned'];
  return (
    <>
      <Title title={payment ? 'Payments' : 'Delivery'} eyebrow="Latest 100 records" />
      <div className="grid grid-2">
        {data?.map((record) => (
          <details className="card" key={record.id}>
            <summary>
              {record.orders?.number || record.order_id} · {record.status} ·{' '}
              {payment ? money(record.amount) : record.courier || 'Unassigned'}
            </summary>
            <div className="stack" style={{ marginTop: 20 }}>
              {!payment && (
                <p>
                  {record.orders?.customer_name}
                  <br />
                  {record.orders?.phone}
                  <br />
                  {record.orders?.address}, {record.orders?.city}
                </p>
              )}
              {permissions.includes(`${kind}.edit`) && (
                <ActionForm
                  action={operation}
                  confirm={
                    payment
                      ? 'Record this payment state? Refund entries record a manual cash refund; they do not transfer funds.'
                      : undefined
                  }
                >
                  <input type="hidden" name="operation" value={payment ? 'payment' : 'delivery'} />
                  <input type="hidden" name="p_id" value={record.id} />
                  <Field label="Status" name="p_status">
                    <select name="p_status" defaultValue={record.status}>
                      {statuses.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  {!payment && (
                    <Field label="Courier / driver" name="p_courier" value={record.courier || ''} />
                  )}
                  <Field label="Reference" name="p_reference" value={record.reference || ''} />
                  <Field label="Notes" name="p_notes">
                    <textarea name="p_notes" defaultValue={record.notes} />
                  </Field>
                </ActionForm>
              )}
            </div>
          </details>
        ))}
      </div>
      {!data?.length && <Empty>No {kind} yet. These are created automatically at checkout.</Empty>}
    </>
  );
}
