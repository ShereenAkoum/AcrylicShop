import { Tracking } from '@/components/checkout';
import { Title } from '@/components/ui';
export const metadata = { title: 'Track your order', robots: { index: false } };
export default function Page() {
  return (
    <div className="container section" style={{ maxWidth: 800 }}>
      <Title title="Follow your reminder." />
      <Tracking />
    </div>
  );
}
