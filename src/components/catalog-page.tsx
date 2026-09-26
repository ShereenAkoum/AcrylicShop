import Link from 'next/link';
import { catalog } from '@/lib/catalog';
import { ProductCard } from './product-card';
import { Empty, Title } from './ui';
export async function CatalogPage({
  title,
  q,
  category,
  collection,
  page = 1,
}: {
  title: string;
  q?: string;
  category?: string;
  collection?: string;
  page?: number;
}) {
  const { products, count } = await catalog({ q, category, collection, page });
  return (
    <div className="container">
      <Title title={title} eyebrow="Objects with intention" />
      <form className="row" action="/search" style={{ marginBottom: 32 }}>
        <input
          className="control"
          style={{ maxWidth: 420 }}
          name="q"
          aria-label="Search products"
          placeholder="Find a meaningful reminder…"
          defaultValue={q}
        />
        <button className="button secondary">Search</button>
        <span className="muted small">{count} reminders</span>
      </form>
      {products.length ? (
        <div className="grid grid-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <Empty>No products found. Try another search or visit us again soon.</Empty>
      )}
      <div className="row section">
        {page > 1 && (
          <Link
            className="button secondary"
            href={`?page=${page - 1}&q=${encodeURIComponent(q || '')}`}
          >
            Previous
          </Link>
        )}
        {count > page * 12 && (
          <Link
            className="button secondary"
            href={`?page=${page + 1}&q=${encodeURIComponent(q || '')}`}
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
