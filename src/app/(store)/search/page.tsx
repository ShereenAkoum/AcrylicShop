import { CatalogPage } from '@/components/catalog-page';
export const metadata = { title: 'Search', robots: { index: false } };
export default async function Search({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const s = await searchParams;
  return (
    <CatalogPage
      title="Find your reminder."
      q={s.q?.slice(0, 100)}
      page={Math.max(1, Number(s.page) || 1)}
    />
  );
}
