import { Checkout } from '@/components/checkout';
import { Title } from '@/components/ui';
import { configured } from '@/lib/env';
import { adminDb } from '@/lib/supabase/admin';
export const dynamic = 'force-dynamic';
export default async function CheckoutPage() {
  if (!configured())
    return (
      <div className="container section">
        <h1>Checkout is being prepared.</h1>
        <p>Please check back once the shop opens.</p>
      </div>
    );
  const { data, error } = await adminDb()
    .from('site_settings')
    .select('value')
    .eq('key', 'commerce')
    .single();
  if (error) throw new Error('Delivery settings unavailable');
  return (
    <div className="container section">
      <Title title="A meaningful choice." />
      <Checkout fee={data.value.delivery_fee} currency={data.value.currency} />
    </div>
  );
}
