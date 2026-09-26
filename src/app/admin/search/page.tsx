import Link from 'next/link';
import { staff } from '@/lib/auth';
import { Title } from '@/components/ui';
export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { client, permissions } = await staff();
  const q = ((await searchParams).q || '').replace(/[^\p{L}\p{N} @.+_-]/gu, '').slice(0, 100);
  const targets = [
    ['orders', 'orders.view', ['number']],
    ['customers', 'customers.view', ['full_name', 'phone', 'email']],
    ['products', 'products.view', ['title', 'sku']],
    ['designs', 'designs.view', ['title', 'code']],
  ] as const;
  const results = await Promise.all(
    targets
      .filter(([, permission]) => permissions.includes(permission))
      .map(async ([table, , fields]) => {
        const { data } = q
          ? await client
              .from(table)
              .select('*')
              .or(fields.map((f) => `${f}.ilike.%${q}%`).join(','))
              .limit(20)
          : { data: [] };
        return { table, rows: data || [] };
      }),
  );
  return (
    <>
      <Title title="Search workspace" />
      <form className="row">
        <input
          className="control"
          style={{ maxWidth: 500 }}
          name="q"
          defaultValue={q}
          aria-label="Global search"
          placeholder="Order, customer, phone, email, product, SKU, design…"
        />
        <button className="button">Search</button>
      </form>
      <div className="grid grid-2 section">
        {results.map((group) => (
          <section className="card" key={group.table}>
            <h2>{group.table}</h2>
            {group.rows.map((r) => (
              <p key={r.id}>
                <Link href={`/admin/${group.table}/${r.id}`}>
                  {r.number || r.full_name || r.title} →
                </Link>
              </p>
            ))}
            {!group.rows.length && <p className="muted">No matches.</p>}
          </section>
        ))}
      </div>
    </>
  );
}
