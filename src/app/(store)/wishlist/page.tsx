import { Wishlist } from '@/components/cart';
import { Title } from '@/components/ui';
export default function WishlistPage() {
  return (
    <div className="container section">
      <Title title="Close to your heart." />
      <Wishlist />
    </div>
  );
}
