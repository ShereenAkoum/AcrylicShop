import { notFound } from 'next/navigation';
import { product, catalog } from '@/lib/catalog';
import { ProductPurchase } from '@/components/cart';
import { ProductCard } from '@/components/product-card';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await product((await params).slug);
  return {
    title: p?.seo_title || p?.title || 'Product',
    description: p?.seo_description || p?.description,
    alternates: { canonical: `/products/${p?.slug || ''}` },
  };
}
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await product((await params).slug);
  if (!p) notFound();
  const related = await catalog({ selection: 'featured' });
  return (
    <div className="container">
      <ProductPurchase product={p} />
      <section className="section">
        <h2>More moments of meaning.</h2>
        <div className="grid grid-4">
          {related.products
            .filter((r) => r.id !== p.id)
            .slice(0, 4)
            .map((r) => (
              <ProductCard key={r.id} product={r} />
            ))}
        </div>
      </section>
    </div>
  );
}
