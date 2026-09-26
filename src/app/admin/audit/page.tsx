import { staff } from '@/lib/auth';
import { Title } from '@/components/ui';
import { DataTable } from '@/components/operations';
export default async function Audit({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    actor?: string;
    entity?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const { client } = await staff('audit.view');
  const s = await searchParams;
  const page = Math.max(1, Number(s.page) || 1);
  let query = client
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (s.q) query = query.ilike('action', `%${s.q.replace(/[%_]/g, '')}%`);
  if (s.actor) query = query.eq('actor', s.actor);
  if (s.entity) query = query.eq('entity_type', s.entity);
  if (s.from) query = query.gte('created_at', s.from);
  if (s.to) query = query.lte('created_at', `${s.to}T23:59:59Z`);
  const { data, error, count } = await query.range((page - 1) * 50, page * 50 - 1);
  if (error) throw new Error(error.message);
  return (
    <>
      <Title title="Audit Log" eyebrow="Accountability, built in" />
      <form className="grid grid-3 card" style={{ marginBottom: 24 }}>
        {['q', 'actor', 'entity', 'from', 'to'].map((key) => (
          <label className="field" key={key}>
            {key === 'q' ? 'Action contains' : key}
            <input
              name={key}
              type={key === 'from' || key === 'to' ? 'date' : 'text'}
              defaultValue={s[key as keyof typeof s]}
            />
          </label>
        ))}
        <button className="button">Filter</button>
      </form>
      <p className="muted small">{count || 0} events · newest first</p>
      <DataTable
        rows={data || []}
        columns={['created_at', 'actor', 'action', 'entity_type', 'entity_id']}
      />
      {data?.map((event) => (
        <details key={event.id} className="card small" style={{ marginTop: 8 }}>
          <summary>
            {event.created_at} · {event.entity_type} · {event.action} metadata
          </summary>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {JSON.stringify(event.metadata, null, 2)}
          </pre>
        </details>
      ))}
      <form className="row section">
        {Object.entries(s)
          .filter(([k]) => k !== 'page')
          .map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        <label className="field">
          Page
          <input type="number" min={1} name="page" defaultValue={page} />
        </label>
        <button className="button secondary">Go</button>
      </form>
    </>
  );
}
