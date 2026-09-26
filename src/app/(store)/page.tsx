import { document } from '@/lib/catalog';
import { HomeSection } from '@/components/home-sections';
import { sectionSchema } from '@/lib/cms';
import { configured } from '@/lib/env';
export async function generateMetadata() {
  const content = await document('homepage');
  return {
    title: content?.seo_title || 'YAQEEN — A more meaningful life',
    description: content?.seo_description || undefined,
    alternates: { canonical: '/' },
  };
}
export default async function Home() {
  const content = await document('homepage');
  if (configured() && !content)
    return (
      <section className="container section">
        <p className="eyebrow">YAQEEN / يقين</p>
        <h1>Something meaningful is taking shape.</h1>
        <p>Our collection is being prepared. Please visit again soon.</p>
      </section>
    );
  const sections = content?.sections || [
    sectionSchema.parse({
      id: 'setup',
      type: 'hero',
      enabled: true,
      heading: 'Little reminders. Meaningful moments.',
      subheading: 'YAQEEN / A MORE MEANINGFUL LIFE',
      body: 'A collection of Islamic acrylic reminders for a more peaceful and purposeful life.',
      cta_text: 'SHOP THE COLLECTION',
      cta_url: '/shop',
    }),
  ];
  return (
    <>
      {!configured() && (
        <div className="container notice small">
          Store setup is in progress. Connect Supabase and publish your collection to begin
          accepting orders.
        </div>
      )}
      {sections.map((s) => (
        <HomeSection section={s} key={s.id} />
      ))}
    </>
  );
}
