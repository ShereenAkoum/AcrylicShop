'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { WebsiteDocument, Section } from '@/lib/cms';
import { sectionSchema } from '@/lib/cms';
import { ActionForm } from './action-form';
import { unpublishDocument } from '@/app/admin/catalog-actions';
import { saveDocument, publishDocument } from '@/app/admin/actions';
export function CmsEditor({
  id,
  documentKey,
  initial,
  canPublish,
  products,
  collections,
  media,
}: {
  id: string;
  documentKey: string;
  initial: WebsiteDocument;
  canPublish: boolean;
  products: { id: string; title: string }[];
  collections: { id: string; title: string }[];
  media: { url: string; title: string }[];
}) {
  const [doc, setDoc] = useState(initial);
  function update(key: keyof WebsiteDocument, value: unknown) {
    setDoc({ ...doc, [key]: value });
  }
  function section(index: number, patch: Partial<Section>) {
    setDoc({
      ...doc,
      sections: doc.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    });
  }
  function move(index: number, delta: number) {
    const sections = [...doc.sections];
    const target = index + delta;
    if (target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    setDoc({ ...doc, sections });
  }
  return (
    <div className="stack">
      {canPublish && (
        <ActionForm
          action={unpublishDocument}
          label="Unpublish"
          confirm="Remove the published version from the storefront? Your draft is preserved."
        >
          <input type="hidden" name="id" value={id} />
        </ActionForm>
      )}
      <div className="row between">
        <p className="muted">
          Edit the draft, save, then preview. Publishing is a separate action.
        </p>
        <Link className="button secondary" href={`/admin/website/preview?key=${documentKey}`}>
          Preview saved draft
        </Link>
      </div>
      <ActionForm action={saveDocument} label="Save draft">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="document" value={JSON.stringify(doc)} />
        {documentKey === 'theme' && (
          <div className="card grid grid-2">
            {(['light_primary', 'dark_primary'] as const).map((key) => (
              <label className="field" key={key}>
                {key.replaceAll('_', ' ')}
                <input
                  type="color"
                  value={doc[key]}
                  onChange={(e) => update(key, e.target.value)}
                />
              </label>
            ))}
            <p className="muted">
              Check text and button contrast in both preview modes before publishing.
            </p>
          </div>
        )}
        <div className="card grid grid-2">
          {(
            [
              'heading',
              'body',
              'seo_title',
              'seo_description',
              'contact_email',
              'contact_phone',
              'announcement',
            ] as const
          ).map((key) => (
            <label className="field" key={key}>
              {key.replaceAll('_', ' ')}
              {key === 'body' ? (
                <textarea value={doc[key]} onChange={(e) => update(key, e.target.value)} />
              ) : (
                <input value={doc[key]} onChange={(e) => update(key, e.target.value)} />
              )}
            </label>
          ))}
        </div>
        {documentKey === 'homepage' && (
          <>
            <h2>Homepage sections</h2>
            {doc.sections.map((s, index) => (
              <details className="card" key={s.id} open={index === 0}>
                <summary>
                  {index + 1}. {s.heading || s.type} {!s.enabled && '· Hidden'}
                </summary>
                <div className="stack" style={{ marginTop: 20 }}>
                  <div className="row">
                    <button
                      type="button"
                      className="button secondary"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      ↑ Move up
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={index === doc.sections.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      ↓ Move down
                    </button>
                    <label>
                      <input
                        type="checkbox"
                        checked={s.enabled}
                        onChange={(e) => section(index, { enabled: e.target.checked })}
                      />{' '}
                      Visible
                    </label>
                    <button
                      type="button"
                      className="button danger"
                      onClick={() => {
                        if (confirm('Remove this section from the draft?'))
                          update(
                            'sections',
                            doc.sections.filter((_, i) => i !== index),
                          );
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-2">
                    <label className="field">
                      Section type
                      <select
                        value={s.type}
                        onChange={(e) =>
                          section(index, { type: e.target.value as Section['type'] })
                        }
                      >
                        {[
                          'hero',
                          'products',
                          'categories',
                          'collection',
                          'banner',
                          'story',
                          'newsletter',
                        ].map((type) => (
                          <option key={type}>{type}</option>
                        ))}
                      </select>
                    </label>
                    {(
                      [
                        'heading',
                        'subheading',
                        'body',
                        'arabic',
                        'image',
                        'cta_text',
                        'cta_url',
                      ] as const
                    ).map((key) => (
                      <label className="field" key={key}>
                        {key.replaceAll('_', ' ')}
                        <input
                          dir={key === 'arabic' ? 'rtl' : undefined}
                          lang={key === 'arabic' ? 'ar' : undefined}
                          value={s[key]}
                          onChange={(e) => section(index, { [key]: e.target.value })}
                        />
                      </label>
                    ))}
                    <label className="field">
                      Choose image from media
                      <select value="" onChange={(e) => section(index, { image: e.target.value })}>
                        <option value="">Select reusable image</option>
                        {media.map((m) => (
                          <option key={m.url} value={m.url}>
                            {m.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Product selection
                      <select
                        value={s.selection}
                        onChange={(e) =>
                          section(index, { selection: e.target.value as Section['selection'] })
                        }
                      >
                        {['featured', 'bestseller', 'new_arrival', 'selected'].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Collection
                      <select
                        value={s.collection_id}
                        onChange={(e) => section(index, { collection_id: e.target.value })}
                      >
                        <option value="">None</option>
                        {collections.map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Selected products (Ctrl / Command for multiple)
                      <select
                        multiple
                        value={s.product_ids}
                        onChange={(e) =>
                          section(index, {
                            product_ids: Array.from(e.target.selectedOptions, (o) => o.value),
                          })
                        }
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </details>
            ))}
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                update('sections', [
                  ...doc.sections,
                  sectionSchema.parse({
                    id: crypto.randomUUID(),
                    type: 'story',
                    enabled: true,
                    heading: 'New section',
                  }),
                ])
              }
            >
              + Add section
            </button>
          </>
        )}
        <div className="card stack">
          <h2>Navigation / footer links</h2>
          {doc.links.map((l, i) => (
            <div className="row" key={i}>
              <label className="field">
                Label
                <input
                  value={l.label}
                  onChange={(e) =>
                    update(
                      'links',
                      doc.links.map((v, n) => (n === i ? { ...v, label: e.target.value } : v)),
                    )
                  }
                />
              </label>
              <label className="field">
                URL
                <input
                  value={l.url}
                  onChange={(e) =>
                    update(
                      'links',
                      doc.links.map((v, n) => (n === i ? { ...v, url: e.target.value } : v)),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  update(
                    'links',
                    doc.links.filter((_, n) => n !== i),
                  )
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="button secondary"
            onClick={() => update('links', [...doc.links, { label: 'New link', url: '/shop' }])}
          >
            + Add link
          </button>
        </div>
        <div className="card stack">
          <h2>FAQs</h2>
          {doc.faqs.map((f, i) => (
            <div key={i} className="grid grid-2">
              <label className="field">
                Question
                <input
                  value={f.question}
                  onChange={(e) =>
                    update(
                      'faqs',
                      doc.faqs.map((v, n) => (n === i ? { ...v, question: e.target.value } : v)),
                    )
                  }
                />
              </label>
              <label className="field">
                Answer
                <textarea
                  value={f.answer}
                  onChange={(e) =>
                    update(
                      'faqs',
                      doc.faqs.map((v, n) => (n === i ? { ...v, answer: e.target.value } : v)),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  update(
                    'faqs',
                    doc.faqs.filter((_, n) => n !== i),
                  )
                }
              >
                Remove FAQ
              </button>
            </div>
          ))}
          <button
            type="button"
            className="button secondary"
            onClick={() => update('faqs', [...doc.faqs, { question: 'New question', answer: '' }])}
          >
            + Add FAQ
          </button>
        </div>
      </ActionForm>
      {canPublish && (
        <ActionForm
          action={publishDocument}
          label="Publish saved draft"
          confirm="Publish the last saved draft to the live storefront?"
        >
          <input type="hidden" name="id" value={id} />
        </ActionForm>
      )}
    </div>
  );
}
export function PreviewControls({ documentKey }: { documentKey: string }) {
  const [mobile, setMobile] = useState(false);
  const [theme, setTheme] = useState('light');
  return (
    <div className="stack">
      <div className="row">
        <button className="button secondary" onClick={() => setMobile(!mobile)}>
          {mobile ? 'Switch to desktop' : 'Switch to mobile'}
        </button>
        <select
          className="control"
          style={{ width: 150 }}
          aria-label="Preview theme"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        >
          <option>light</option>
          <option>dark</option>
        </select>
      </div>
      <iframe
        className="preview-frame"
        style={{ maxWidth: mobile ? 390 : '100%', margin: 'auto' }}
        title="Saved website draft preview"
        src={`/preview/${documentKey}?theme=${theme}`}
      />
    </div>
  );
}
