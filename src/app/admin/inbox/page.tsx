import { staff } from '@/lib/auth';
import { Title } from '@/components/ui';
import { DataTable } from '@/components/operations';
export default async function Inbox() {
  const { client } = await staff('customers.view');
  const [messages, subscribers] = await Promise.all([
    client
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),
    client
      .from('newsletter_subscribers')
      .select('*')
      .order('consent_at', { ascending: false })
      .limit(100),
  ]);
  if (messages.error || subscribers.error) throw new Error('Inbox unavailable');
  return (
    <>
      <Title title="Messages & subscribers" eyebrow="Latest 100 records" />
      <div className="stack">
        {messages.data.map((m) => (
          <article className="card" key={m.id}>
            <h3>{m.full_name}</h3>
            <p>
              {m.email} · {m.created_at}
            </p>
            <p style={{ whiteSpace: 'pre-line' }}>{m.message}</p>
          </article>
        ))}
      </div>
      <section className="section">
        <h2>Newsletter subscribers</h2>
        <p className="muted">
          Consent is recorded. Email delivery is not connected in this release.
        </p>
        <DataTable rows={subscribers.data} columns={['email', 'consent_at']} />
      </section>
    </>
  );
}
