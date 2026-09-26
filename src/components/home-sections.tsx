import { ContactForm } from './contact';
import { assetUrl } from '@/lib/assets';
import Image from 'next/image';
import Link from 'next/link';
import { catalog } from '@/lib/catalog';
import { configured } from '@/lib/env';
import { db } from '@/lib/supabase/server';
import type { Section } from '@/lib/cms';
import { ProductCard } from './product-card';
import { Empty } from './ui';
export async function HomeSection({ section: s }: { section: Section }) {
  if (!s.enabled) return null;
  if (s.type === 'hero')
    return (
      <section className="container hero">
        <div>
          <p className="eyebrow">{s.subheading}</p>
          <h1>{s.heading}</h1>
          <p className="muted">{s.body}</p>
          <Link className="button" href={s.cta_url || '/shop'}>
            {s.cta_text || 'Shop the collection'} <span aria-hidden>↗</span>
          </Link>
          <p className="small muted" style={{ marginTop: 28 }}>
            Made with intention. Kept close to heart.
          </p>
        </div>
        <div className="hero-art">
          {s.image ? (
            <Image
              src={assetUrl(s.image)}
              alt={s.heading}
              fill
              priority
              sizes="(max-width:760px) 90vw, 45vw"
            />
          ) : (
            <>
              <div className="acrylic">
                <span className="arabic" dir="rtl" lang="ar">
                  {s.arabic || 'يقين'}
                </span>
                <small>A MORE MEANINGFUL LIFE</small>
              </div>
              <span className="art-caption">
                Illustrative placeholder · artwork curated by YAQEEN
              </span>
            </>
          )}
        </div>
      </section>
    );
  if (s.type === 'products') {
    const { products } = await catalog({
      selection: s.selection === 'selected' ? undefined : s.selection,
      ids: s.selection === 'selected' ? s.product_ids : undefined,
    });
    return (
      <section className="container section">
        <div className="row between">
          <div>
            <p className="eyebrow">{s.subheading}</p>
            <h2>{s.heading}</h2>
          </div>
          <Link className="small" href={s.cta_url || '/shop'}>
            {s.cta_text || 'Explore all'} →
          </Link>
        </div>
        {products.length ? (
          <div className="grid grid-4">
            {products.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <Empty>Our collection is being thoughtfully prepared. Please check back soon.</Empty>
        )}
      </section>
    );
  }
  if (s.type === 'newsletter')
    return (
      <section className="container section">
        <div className="card grid grid-2">
          <div>
            <p className="eyebrow">{s.subheading}</p>
            <h2>{s.heading}</h2>
            <p>{s.body}</p>
          </div>
          <ContactForm newsletter />
        </div>
      </section>
    );
  if (s.type === 'categories') {
    const { data } = configured()
      ? await (await db()).from('categories').select('*').eq('active', true).limit(12)
      : { data: [] };
    return (
      <section className="container section">
        <p className="eyebrow">{s.subheading}</p>
        <h2>{s.heading}</h2>
        <div className="grid grid-3">
          {data?.map((c) => (
            <Link className="card" href={`/shop?category=${c.slug}`} key={c.id}>
              <h3>{c.title} ↗</h3>
              <p className="muted">{c.description}</p>
            </Link>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className="container section">
      <div className="card grid grid-2" style={{ padding: 'clamp(24px,5vw,64px)' }}>
        <div>
          <p className="eyebrow">{s.subheading}</p>
          <h2>{s.heading}</h2>
          {s.arabic && (
            <p className="arabic" lang="ar" dir="rtl">
              {s.arabic}
            </p>
          )}
        </div>
        <div>
          <p className="muted" style={{ whiteSpace: 'pre-line' }}>
            {s.body}
          </p>
          {s.cta_text && (
            <Link className="button secondary" href={s.cta_url || '/contact'}>
              {s.cta_text} →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
