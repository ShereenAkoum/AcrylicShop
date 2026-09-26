import { staff } from '@/lib/auth';
import { Title, Field } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { saveSettings } from '@/app/admin/actions';
export default async function Settings() {
  const { client } = await staff('settings.view');
  const { data } = await client
    .from('site_settings')
    .select('value')
    .eq('key', 'commerce')
    .single();
  return (
    <>
      <Title title="Settings" />
      <div className="card">
        <h2>Commerce</h2>
        <ActionForm action={saveSettings}>
          <Field label="Currency" name="currency" value="USD" />
          <Field
            label="Delivery fee (minor units)"
            name="delivery_fee"
            type="number"
            value={data?.value.delivery_fee || 0}
          />
        </ActionForm>
        <p className="muted small">
          This release operates in USD. All stored prices are integer cents. Delivery is a flat fee
          per order.
        </p>
      </div>
    </>
  );
}
