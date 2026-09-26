import { Cart } from '@/components/cart';
import { Title } from '@/components/ui';
export default function CartPage() {
  return (
    <div className="container section">
      <Title title="Your bag." />
      <Cart />
    </div>
  );
}
