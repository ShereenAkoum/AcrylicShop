import { CatalogPage } from '@/components/catalog-page';
export const metadata = { title: 'Shop the collection' };
export default async function Shop({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const s = await searchParams;
  return (
    <CatalogPage
      title="Small reminders. Deep meaning."
      category={s.category}
      showCategories
      page={Math.max(1, Number(s.page) || 1)}
    />
  );
}
