import { AddPopup } from './add-popup';
import { VariantTable } from './variant-table';
import { ProductImageTable } from './product-image-table';
import { VariantImage } from './variant-image';
import { CategoryControls } from './category-controls';
import { removeCollectionProduct, customerAddress } from '@/app/admin/catalog-actions';
import Link from 'next/link';
import { staff } from '@/lib/auth';
import { resources } from '@/lib/resources';
import { ActionForm } from './action-form';
import { Field, Title, Empty } from './ui';
import { saveResource, saveVariant, saveCollection } from '@/app/admin/actions';
import { Upload } from './upload';
import { notFound } from 'next/navigation';
export async function ResourceList({
  name,
  q = '',
  page = 1,
}: {
  name: string;
  q?: string;
  page?: number;
}) {
  const r = resources[name];
  if (!r) notFound();
  const { client, permissions } = await staff(`${r.permission}.view`);
  let query = client
    .from(r.table)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (q) {
    const term = q.replace(/[^\p{L}\p{N} @.+_-]/gu, '').slice(0, 100);
    query = query.or(
      (name === 'customers'
        ? ['full_name', 'phone', 'email']
        : name === 'products'
          ? ['title', 'sku']
          : name === 'designs'
            ? ['title', 'code']
            : ['title']
      )
        .map((c) => `${c}.ilike.%${term}%`)
        .join(','),
    );
  }
  const { data, error, count } = await query.range((page - 1) * 25, page * 25 - 1);
  if (error) throw new Error(error.message);
  return (
    <>
      <Title title={r.title} eyebrow="Workspace">
        {permissions.includes(`${r.permission}.edit`) && (
          <AddPopup title={`Add ${name === 'categories' ? 'category' : name.slice(0, -1)}`}>
            <ResourceEditor name={name} id="new" embedded />
          </AddPopup>
        )}
      </Title>
      <form className="row" style={{ marginBottom: 20 }}>
        <input
          className="control"
          name="q"
          aria-label={`Search ${r.title}`}
          placeholder={`Search ${r.title.toLowerCase()}…`}
          defaultValue={q}
          style={{ maxWidth: 400 }}
        />
        <button className="button secondary">Search</button>
      </form>
      {data?.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {r.columns.map((c) => (
                  <th key={c}>{c.replaceAll('_', ' ')}</th>
                ))}
                <th className="actions-cell">
                  {['categories', 'products'].includes(name) ? 'Actions' : 'Details'}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  {r.columns.map((c) => (
                    <td key={c}>
                      {(name === 'categories' && c === 'active') ||
                      (name === 'products' && c === 'status') ? (
                        <CategoryControls
                          resource={name === 'products' ? 'products' : 'categories'}
                          id={row.id}
                          title={row.title}
                          active={name === 'products' ? row.status === 'Active' : row.active}
                          editable={permissions.includes('products.edit')}
                          toggle
                        />
                      ) : typeof row[c] === 'boolean' ? (
                        row[c] ? (
                          'Yes'
                        ) : (
                          'No'
                        )
                      ) : name === 'products' && c === 'price' ? (
                        new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(row[c] / 100)
                      ) : (
                        String(row[c] ?? '—')
                      )}
                    </td>
                  ))}
                  <td className="actions-cell">
                    {name === 'categories' || name === 'products' ? (
                      <CategoryControls
                        resource={name}
                        id={row.id}
                        title={row.title}
                        active={row.active}
                        editable={permissions.includes('products.edit')}
                      />
                    ) : (
                      <Link href={`/admin/${name}/${row.id}`}>Open</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No records found. Create your first record to get started.</Empty>
      )}
      <div className="row section">
        {page > 1 && <Link href={`?page=${page - 1}&q=${encodeURIComponent(q)}`}>← Previous</Link>}
        <span className="small muted">
          {count || 0} records · Page {page}
        </span>
        {(count || 0) > page * 25 && (
          <Link href={`?page=${page + 1}&q=${encodeURIComponent(q)}`}>Next →</Link>
        )}
      </div>
    </>
  );
}
export async function ResourceEditor({
  name,
  id,
  readOnly = false,
  embedded = false,
}: {
  name: string;
  id: string;
  readOnly?: boolean;
  embedded?: boolean;
}) {
  const r = resources[name];
  if (!r) notFound();
  const { client, permissions } = await staff(`${r.permission}.view`);
  const isNew = id === 'new';
  const { data, error } = isNew
    ? { data: null, error: null }
    : await client.from(r.table).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!isNew && !data) notFound();
  const editable = !readOnly && permissions.includes(`${r.permission}.edit`);
  const relations: Record<string, { id: string; title: string }[]> = {};
  for (const field of r.fields.filter((f) => f.type === 'relation' && f.table)) {
    const { data } = await client.from(field.table!).select('id,title').limit(500);
    relations[field.key] = data || [];
  }
  return (
    <>
      {!embedded && (
        <Title
          title={isNew ? `Create ${r.title.toLowerCase()}` : String(data?.title || data?.full_name)}
        >
          <Link className="button secondary" href={`/admin/${name}`}>
            Back to {r.title}
          </Link>
        </Title>
      )}
      <div className="card">
        <ActionForm
          action={saveResource}
          hideSubmit={!editable}
          confirm="Save these changes, including any publication or archive status change?"
        >
          <input type="hidden" name="_resource" value={name} />
          <input type="hidden" name="_id" value={isNew ? '' : id} />
          <fieldset disabled={!editable} className="grid grid-2" style={{ border: 0, padding: 0 }}>
            {r.fields.map((f) => (
              <Field key={f.key} name={f.key} label={f.label}>
                {f.type === 'textarea' ? (
                  <textarea
                    name={f.key}
                    defaultValue={data?.[f.key] || ''}
                    dir={f.arabic ? 'rtl' : undefined}
                    lang={f.arabic ? 'ar' : undefined}
                  />
                ) : f.type === 'checkbox' ? (
                  <input
                    className="active-toggle"
                    role="switch"
                    type="checkbox"
                    name={f.key}
                    defaultChecked={
                      name === 'products' && f.key === 'status'
                        ? data?.status === 'Active'
                        : (data?.[f.key] ?? f.key === 'active')
                    }
                  />
                ) : f.type === 'select' || f.type === 'relation' ? (
                  <select name={f.key} defaultValue={data?.[f.key] || ''}>
                    {f.type === 'relation' && <option value="">None</option>}
                    {f.options?.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                    {relations[f.key]?.map((o) => (
                      <option value={o.id} key={o.id}>
                        {o.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={f.key}
                    type={f.type === 'number' ? 'number' : 'text'}
                    min={f.type === 'number' ? 0 : undefined}
                    step={name === 'products' && f.key === 'price' ? '0.01' : undefined}
                    defaultValue={
                      name === 'products' && f.key === 'price' && data
                        ? data.price / 100
                        : Array.isArray(data?.[f.key])
                          ? data?.[f.key].join(', ')
                          : (data?.[f.key] ?? '')
                    }
                    required={f.required}
                  />
                )}
              </Field>
            ))}
          </fieldset>
        </ActionForm>
      </div>
      {!isNew && name === 'products' && <ProductExtras id={id} readOnly={!editable} />}{' '}
      {!isNew && name === 'designs' && (
        <section className="section stack">
          <h2>Private production files</h2>
          <Upload bucket="production-files" entityId={id} />
          <PrivateFiles id={id} />
        </section>
      )}
      {!isNew && name === 'collections' && <CollectionExtras id={id} />}{' '}
      {!isNew && name === 'customers' && <CustomerOrders id={id} />}
    </>
  );
}
async function ProductExtras({ id, readOnly }: { id: string; readOnly: boolean }) {
  const { client } = await staff('products.view');
  const { data: variants } = await client.from('product_variants').select('*').eq('product_id', id);
  const { data: images } = await client.from('product_images').select('*').eq('product_id', id);
  const { data: inventory } = await client.from('inventory_items').select('id,sku,title,quantity').order('title');
  return (
    <fieldset disabled={readOnly} className="section stack" style={{ border: 0, paddingInline: 0 }}>
      <h2>Product images</h2>
      <ProductImageTable rows={images || []} productId={id} editable={!readOnly} />
      <h2>Variants</h2>
      <p className="muted">
        Each combination has its own SKU and uses stock from the selected physical inventory item.
      </p>
      <VariantTable
        rows={variants || []}
        editable={!readOnly}
        editors={[...(variants || []), null].map((v, index) => (
          <div className="card" key={v?.id || 'new'}>
            <ActionForm action={saveVariant}>
              <input type="hidden" name="id" value={v?.id || ''} />
              <input type="hidden" name="product_id" value={id} />
              <div className="grid grid-3" style={{ marginTop: 20 }}>
                {['sku', 'color', 'price_override'].map((key) => (
                  <Field
                    key={key}
                    name={key}
                    label={
                      key === 'price_override' ? 'Price override (USD)' : key.replaceAll('_', ' ')
                    }
                    value={
                      key === 'price_override' && v?.[key] != null ? v[key] / 100 : (v?.[key] ?? '')
                    }
                    step={key === 'price_override' ? '0.01' : undefined}
                    required={['sku', 'color'].includes(key)}
                    type={key === 'price_override' ? 'number' : 'text'}
                  />
                ))}
                <Field name="inventory_item_id" label="Inventory">
                  <select name="inventory_item_id" defaultValue={v?.inventory_item_id || ''} required>
                    <option value="">Select physical inventory</option>
                    {inventory?.map((item) => <option key={item.id} value={item.id}>{item.title} — {item.quantity} available</option>)}
                  </select>
                </Field>
                <Field
                  name="stock"
                  label="Stock"
                  type="number"
                  min={0}
                  value={v?.stock_allocation ?? 0}
                  required
                />
              </div>
              <VariantImage key={v?.image_url || 'empty'} initialUrl={v?.image_url || ''} />
              <label className="row">
                <input
                  className="active-toggle"
                  role="switch"
                  name="active"
                  type="checkbox"
                  defaultChecked={v?.active ?? true}
                />
                Active variant {index + 1}
              </label>
            </ActionForm>
          </div>
        ))}
      />
    </fieldset>
  );
}
async function PrivateFiles({ id }: { id: string }) {
  const { client } = await staff('designs.view');
  const { data } = await client.from('design_assets').select('id,title').eq('design_id', id);
  return (
    <div className="stack">
      {data?.map((a) => (
        <a className="button secondary" key={a.id} href={`/api/production-file/${a.id}`}>
          Download {a.title} (audited)
        </a>
      ))}
    </div>
  );
}
async function CollectionExtras({ id }: { id: string }) {
  const { client } = await staff('products.view');
  const { data } = await client.from('products').select('id,title').limit(500);
  const { data: members } = await client
    .from('collection_products')
    .select('product_id,products(title)')
    .eq('collection_id', id);
  return (
    <section className="section card">
      <h2>Collection products</h2>
      {members?.map((p, i) => (
        <div key={i}>
          <p>{(p.products as unknown as { title: string })?.title}</p>
          <ActionForm
            action={removeCollectionProduct}
            label="Remove from collection"
            confirm="Remove this product from the collection?"
          >
            <input type="hidden" name="collection_id" value={id} />
            <input type="hidden" name="product_id" value={p.product_id} />
          </ActionForm>
        </div>
      ))}
      <AddPopup title="Add to collection">
        <ActionForm action={saveCollection} label="Add to collection">
          <input type="hidden" name="collection_id" value={id} />
          <Field name="product_id" label="Product">
            <select name="product_id">
              {data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </Field>
        </ActionForm>
      </AddPopup>
    </section>
  );
}
async function CustomerOrders({ id }: { id: string }) {
  const { client, permissions } = await staff('customers.view');
  const { data: addresses } = await client
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', id);
  const { data } = await client
    .from('orders')
    .select('id,number,total,status,created_at')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })
    .limit(100);
  return (
    <section className="section">
      <h2>Addresses</h2>
      <div className="grid grid-2">
        {[...(addresses || []), null].map((a) => (
          <AddPopup title="Add address" inline={Boolean(a)} key={a?.id || 'new'}>
            <div className="card">
              <ActionForm action={customerAddress}>
                <input type="hidden" name="id" value={a?.id || ''} />
                <input type="hidden" name="customer_id" value={id} />
                <Field label="Address" name="address" value={a?.address || ''} required />
                <Field label="City / area" name="city" value={a?.city || ''} required />
              </ActionForm>
            </div>
          </AddPopup>
        ))}
      </div>
      <h2>Order history</h2>
      {permissions.includes('orders.view') && (
        <p>
          {data?.length || 0} recent orders · Spend in these orders:{' '}
          {((data || []).reduce((sum, o) => sum + o.total, 0) / 100).toFixed(2)} USD
        </p>
      )}
      {data?.map((o) => (
        <p key={o.id}>
          <Link href={`/admin/orders/${o.id}`}>
            {o.number} · {o.status} · {(o.total / 100).toFixed(2)}
          </Link>
        </p>
      ))}
    </section>
  );
}
