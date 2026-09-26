import { staff } from '@/lib/auth';
import { Title } from '@/components/ui';
import { DataTable } from '@/components/operations';
import { money } from '@/lib/domain';
export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { client } = await staff('reports.view');
  const s = await searchParams;
  const from = s.from || new Date(new Date().getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const to = s.to || new Date().toISOString().slice(0, 10);
  const end = new Date(to);
  end.setUTCDate(end.getUTCDate() + 1);
  const { data, error } = await client.rpc('sales_report', {
    p_from: from,
    p_to: end.toISOString(),
  });
  if (error) throw new Error(error.message);
  return (
    <>
      <Title title="Reports" eyebrow="A clearer view of your business" />
      <form className="row card">
        <label className="field">
          From
          <input type="date" name="from" defaultValue={from} />
        </label>
        <label className="field">
          Through
          <input type="date" name="to" defaultValue={to} />
        </label>
        <button className="button">Apply dates</button>
      </form>
      <div className="grid grid-3 section">
        {[
          ['Orders', data.summary.orders],
          ['Order value', money(data.summary.sales)],
          ['Average order', money(data.summary.average_order)],
        ].map(([label, value]) => (
          <div className="card" key={label}>
            <p className="eyebrow">{label}</p>
            <div className="metric">{value}</div>
          </div>
        ))}
      </div>
      {[
        ['Best-selling products', data.products, ['title', 'quantity', 'sales']],
        ['Best-selling designs', data.designs, ['code', 'title', 'quantity']],
        ['Payment totals', data.payments, ['status', 'amount', 'records']],
        ['Production volume', data.production, ['stage', 'jobs']],
        ['Delivery status', data.delivery, ['status', 'deliveries']],
      ].map(([title, rows, columns]) => (
        <section className="stack" style={{ marginBottom: 32 }} key={String(title)}>
          <h2>{String(title)}</h2>
          <DataTable rows={rows as Record<string, unknown>[]} columns={columns as string[]} />
        </section>
      ))}
    </>
  );
}
