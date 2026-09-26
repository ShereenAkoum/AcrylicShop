import { CatalogPage } from '@/components/catalog-page';
import { taxonomy } from '@/lib/catalog';
import { configured } from '@/lib/env';
import { notFound } from 'next/navigation';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await taxonomy('categories', slug);
  return {
    title: c?.seo_title || c?.title,
    description: c?.seo_description || c?.description,
    alternates: { canonical: `/categories/${slug}` },
  };
}
export default async function Category({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const c = await taxonomy('categories', slug);
  if (configured() && !c) notFound();
  return (
    <CatalogPage
      title={c?.title || slug.replaceAll('-', ' ')}
      category={slug}
      page={Math.max(1, Number((await searchParams).page) || 1)}
    />
  );
}
