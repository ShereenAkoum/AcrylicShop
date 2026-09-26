import { Confirmation } from '@/components/checkout';
export const metadata = { title: 'Order confirmation', robots: { index: false } };
export default function Page() {
  return (
    <div className="container section">
      <Confirmation />
    </div>
  );
}
