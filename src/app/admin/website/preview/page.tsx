import { staff } from '@/lib/auth';
import { PreviewControls } from '@/components/cms-editor';
export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  await staff('website.view');
  return <PreviewControls documentKey={(await searchParams).key || 'homepage'} />;
}
