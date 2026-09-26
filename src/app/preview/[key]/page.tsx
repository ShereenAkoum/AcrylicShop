import { staff } from '@/lib/auth';
import { document } from '@/lib/catalog';
import { HomeSection } from '@/components/home-sections';
import { PreviewTheme } from '@/components/preview-theme';
import { Brand } from '@/components/ui';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Private preview', robots: { index: false, follow: false } };
export default async function Preview({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ theme?: string }>;
}) {
  await staff('website.view');
  const { key } = await params;
  const { theme } = await searchParams;
  const doc = await document(key, true);
  return (
    <main id="main">
      <PreviewTheme theme={theme === 'dark' ? 'dark' : 'light'} />
      <div className="container section">
        <Brand />
        <p className="badge">PRIVATE SAVED DRAFT PREVIEW</p>
      </div>
      {key === 'homepage' ? (
        doc?.sections.map((section) => <HomeSection key={section.id} section={section} />)
      ) : (
        <div className="container">
          <h1>{doc?.heading}</h1>
          <p style={{ whiteSpace: 'pre-line' }}>{doc?.body}</p>
          {doc?.links.map((l) => (
            <p key={l.label}>
              {l.label} → {l.url}
            </p>
          ))}
          {doc?.faqs.map((f) => (
            <div key={f.question}>
              <h3>{f.question}</h3>
              <p>{f.answer}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
