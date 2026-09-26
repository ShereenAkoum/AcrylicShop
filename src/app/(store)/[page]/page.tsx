import { ContactForm } from '@/components/contact';
import { notFound } from 'next/navigation';
import { document } from '@/lib/catalog';
import { Title } from '@/components/ui';
export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  const content = await document((await params).page);
  return { title: content?.seo_title || content?.heading, description: content?.seo_description };
}
export default async function ContentPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const content = await document(page);
  if (!content && !['about', 'contact', 'faq'].includes(page)) notFound();
  return (
    <div className="container section">
      <Title title={content?.heading || page.charAt(0).toUpperCase() + page.slice(1)} />
      {page === 'contact' && (
        <div className="card" style={{ maxWidth: 700, marginBottom: 30 }}>
          <ContactForm />
        </div>
      )}
      <div className="prose">
        {content?.body || 'We are preparing this page. Please visit again soon.'}
      </div>
      {content?.contact_email && (
        <p>
          <a href={`mailto:${content.contact_email}`}>{content.contact_email}</a>
        </p>
      )}
      {content?.contact_phone && <p>{content.contact_phone}</p>}
      <div className="stack section">
        {content?.faqs.map((f) => (
          <details className="card" key={f.question}>
            <summary>{f.question}</summary>
            <p style={{ marginTop: 16 }}>{f.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
