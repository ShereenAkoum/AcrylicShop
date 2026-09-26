'use client';
import { Fragment, useState, useTransition, type ReactNode } from 'react';
import { PopupCloseContext } from './popup-context';
import Image from 'next/image';
import { Modal } from './modal';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { assetUrl } from '@/lib/assets';
import { deleteVariant } from '@/app/admin/product-actions';
type Row = {
  id: string;
  sku: string;
  color: string;
  active: boolean;
  image_url: string | null;
  price_override: number | null;
};
export function VariantTable({
  rows,
  editors,
  editable,
}: {
  rows: Row[];
  editors: ReactNode[];
  editable: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  return (
    <div className="stack table-section">
      {editable && (
        <button
          type="button"
          className="button table-add"
          aria-label="Add variant"
          title="Add variant"
          onClick={() => {
            setSelected(selected === 'new' ? null : 'new');
            setView(false);
          }}
        >
          <Plus size={18} /> Add variant
        </button>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Variants table">
        <table>
          <thead>
            <tr>
              {[
                'Image',
                'SKU',
                'Color',
                'Price override',
                'Active',
                'Actions',
              ].map((h) => (
                <th key={h} className={h === 'Actions' ? 'actions-cell' : undefined}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Fragment key={row.id}>
                <tr>
                  <td>
                    {row.image_url ? (
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => {
                          setSelected(row.id);
                          setView(true);
                        }}
                        aria-label={`View ${row.sku} image`}
                      >
                        <Image
                          src={assetUrl(row.image_url)}
                          alt={row.sku}
                          width={72}
                          height={56}
                          style={{ objectFit: 'contain' }}
                        />
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{row.sku}</td>
                  <td>{row.color}</td>
                  <td>
                    {row.price_override == null
                      ? 'Product price'
                      : `$${(row.price_override / 100).toFixed(2)}`}
                  </td>
                  <td>{row.active ? 'Active' : 'Inactive'}</td>
                  <td className="actions-cell">
                    <div className="table-actions">
                      <button
                        type="button"
                        className="icon-button"
                        title="View"
                        aria-label={`View ${row.sku}`}
                        onClick={() => {
                          setSelected(row.id);
                          setView(true);
                        }}
                      >
                        <Eye size={18} />
                      </button>
                      {editable && (
                        <>
                          <button
                            type="button"
                            className="icon-button"
                            title="Edit"
                            aria-label={`Edit ${row.sku}`}
                            onClick={() => {
                              setSelected(row.id);
                              setView(false);
                            }}
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            type="button"
                            className="icon-button error"
                            title="Delete"
                            aria-label={`Delete ${row.sku}`}
                            disabled={pending}
                            onClick={() => {
                              setError('');
                              setDeleting(row);
                            }}
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              </Fragment>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6}>No variants yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selected && (
        <Modal
          title={selected === 'new' ? 'Add variant' : view ? 'View variant' : 'Edit variant'}
          onClose={() => setSelected(null)}
        >
          <PopupCloseContext.Provider value={() => setSelected(null)}>
            <fieldset disabled={view || !editable} style={{ border: 0 }}>
              {editors[selected === 'new' ? rows.length : rows.findIndex((r) => r.id === selected)]}
            </fieldset>
          </PopupCloseContext.Provider>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Delete variant?"
          onClose={() => {
            if (!pending) setDeleting(null);
          }}
        >
          <p>Delete {deleting.sku}? Variants with order or stock history cannot be deleted.</p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="row">
            <button
              className="button secondary"
              disabled={pending}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </button>
            <button
              className="button danger"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const result = await deleteVariant(deleting.id);
                  setError(result.error || '');
                  if (!result.error) setDeleting(null);
                })
              }
            >
              {pending ? 'Deleting?' : 'Delete variant'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
