import { assetUrl } from '@/lib/assets';
import {
  productImage,
  removeCollectionProduct,
  customerAddress,
} from '@/app/admin/catalog-actions';
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
          <Link className="button" href={`/admin/${name}/new`}>
            + Create {name === 'categories' ? 'category' : name.slice(0, -1)}
          </Link>
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
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  {r.columns.map((c) => (
                    <td key={c}>
                      {typeof row[c] === 'boolean'
                        ? row[c]
                          ? 'Yes'
                          : 'No'
                        : String(row[c] ?? '—')}
                    </td>
                  ))}
                  <td>
                    <Link href={`/admin/${name}/${row.id}`}>Open →</Link>
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
export async function ResourceEditor({ name, id }: { name: string; id: string }) {
  const r = resources[name];
  if (!r) notFound();
  const { client, permissions } = await staff(`${r.permission}.view`);
  const isNew = id === 'new';
  const { data, error } = isNew
    ? { data: null, error: null }
    : await client.from(r.table).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!isNew && !data) notFound();
  const editable = permissions.includes(`${r.permission}.edit`);
  const relations: Record<string, { id: string; title: string }[]> = {};
  for (const field of r.fields.filter((f) => f.type === 'relation' && f.table)) {
    const { data } = await client.from(field.table!).select('id,title').limit(500);
    relations[field.key] = data || [];
  }
  return (
    <>
      <Title
        title={isNew ? `Create ${r.title.toLowerCase()}` : String(data?.title || data?.full_name)}
      >
        <Link className="button secondary" href={`/admin/${name}`}>
          Back to {r.title}
        </Link>
      </Title>
      <div className="card">
        <ActionForm
          action={saveResource}
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
                    type="checkbox"
                    name={f.key}
                    defaultChecked={data?.[f.key] ?? f.key === 'active'}
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
                    defaultValue={
                      Array.isArray(data?.[f.key])
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
      {!isNew && name === 'products' && <ProductExtras id={id} />}{' '}
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
async function ProductExtras({ id }: { id: string }) {
  const { client } = await staff('products.view');
  const { data: variants } = await client.from('product_variants').select('*').eq('product_id', id);
  const { data: images } = await client.from('product_images').select('*').eq('product_id', id);
  const { data: media } = await client.from('media').select('url,title').limit(200);
  return (
    <section className="section stack">
      <h2>Product images</h2>
      <Upload bucket="product-images" entityId={id} />
      {images?.map((i) => (
        <details className="card" key={i.id}>
          <summary>
            {i.alt || 'Product image'} · position {i.position}
          </summary>
          <a href={assetUrl(i.url)} target="_blank" rel="noreferrer">
            {i.alt || 'Product image'} ↗
          </a>
          <ActionForm action={productImage}>
            <input type="hidden" name="id" value={i.id} />
            <input type="hidden" name="product_id" value={id} />
            <Field label="Replacement image URL" name="url" value={i.url} />
            <Field label="Alt text" name="alt" value={i.alt} />
            <Field label="Position" name="position" type="number" value={i.position} />
          </ActionForm>
          <ActionForm
            action={productImage}
            label="Remove image from product"
            confirm="Remove this image from the product? The reusable media file is preserved."
          >
            <input type="hidden" name="id" value={i.id} />
            <input type="hidden" name="remove" value="true" />
          </ActionForm>
        </details>
      ))}
      <details className="card">
        <summary>Attach an existing media image</summary>
        <ActionForm action={productImage}>
          <input type="hidden" name="product_id" value={id} />
          <Field label="Media image" name="url">
            <select name="url">
              {media?.map((m) => (
                <option key={m.url} value={m.url}>
                  {m.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Alt text" name="alt" required />
          <Field label="Position" name="position" type="number" value={0} />
        </ActionForm>
      </details>
      <h2>Variants</h2>
      <p className="muted">
        Each combination has its own SKU and stock. Add stock through Inventory, where every change
        has a reason and history.
      </p>
      {[...(variants || []), null].map((v, index) => (
        <details className="card" key={v?.id || 'new'} open={!v}>
          <summary>
            {v
              ? `${v.sku} · ${v.color} / ${v.size} / ${v.stand} · Stock: ${v.stock}`
              : '+ Add variant'}
          </summary>
          <ActionForm action={saveVariant}>
            <input type="hidden" name="id" value={v?.id || ''} />
            <input type="hidden" name="product_id" value={id} />
            <div className="grid grid-3" style={{ marginTop: 20 }}>
              {['sku', 'color', 'size', 'stand', 'price_override', 'image_url'].map((key) => (
                <Field
                  key={key}
                  name={key}
                  label={key.replaceAll('_', ' ')}
                  value={v?.[key] ?? ''}
                  required={['sku', 'color', 'size', 'stand'].includes(key)}
                  type={key === 'price_override' ? 'number' : 'text'}
                />
              ))}
            </div>
            <label className="row">
              <input name="active" type="checkbox" defaultChecked={v?.active ?? true} />
              Active variant {index + 1}
            </label>
          </ActionForm>
        </details>
      ))}
    </section>
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
          <div className="card" key={a?.id || 'new'}>
            <ActionForm action={customerAddress}>
              <input type="hidden" name="id" value={a?.id || ''} />
              <input type="hidden" name="customer_id" value={id} />
              <Field label="Address" name="address" value={a?.address || ''} required />
              <Field label="City / area" name="city" value={a?.city || ''} required />
            </ActionForm>
          </div>
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
