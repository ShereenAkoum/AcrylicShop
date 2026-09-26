import { db } from '@/lib/supabase/server';
import Link from 'next/link';
import { catalog } from '@/lib/catalog';
import { ProductCard } from './product-card';
import { Empty, Title } from './ui';
export async function CatalogPage({
  title,
  showCategories = false,
  q,
  category,
  page = 1,
}: {
  title: string;
  showCategories?: boolean;
  q?: string;
  category?: string;
  page?: number;
}) {
  const { products, count } = await catalog({ q, category, page });
  const categories = showCategories
    ? (
        await (
          await db()
        )
          .from('categories')
          .select('id,title,slug')
          .eq('active', true)
          .order('title')
      ).data || []
    : [];
  return (
    <div className="container">
      <Title title={title} eyebrow="Objects with intention" />
      <nav className="row" aria-label="Shop categories" style={{ marginBottom: 24 }}>
        {showCategories && (
          <>
            <Link className={`button ${category ? 'secondary' : ''}`} href="/shop">
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                className={`button ${category === c.slug ? '' : 'secondary'}`}
                href={`/shop?category=${c.slug}`}
                aria-current={category === c.slug ? 'page' : undefined}
              >
                {c.title}
              </Link>
            ))}
          </>
        )}
      </nav>
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
            href={`?page=${page - 1}&q=${encodeURIComponent(q || '')}&category=${encodeURIComponent(category || '')}`}
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
