'use client';
import { useState, useTransition } from 'react';
import Image from 'next/image';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { Modal } from './modal';
import { PopupCloseContext } from './popup-context';
import { Upload } from './upload';
import { VariantImage } from './variant-image';
import { ActionForm } from './action-form';
import { productImage } from '@/app/admin/catalog-actions';
import { assetUrl } from '@/lib/assets';
type Row = { id: string; url: string; alt: string; position: number };
export function ProductImageTable({
  rows,
  productId,
  editable,
}: {
  rows: Row[];
  productId: string;
  editable: boolean;
}) {
  const [action, setAction] = useState<'add' | 'view' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const close = () => {
    if (!pending) {
      setAction(null);
      setSelected(null);
      setError('');
    }
  };
  return (
    <div className="stack table-section">
      {editable && (
        <button type="button" className="button table-add" onClick={() => setAction('add')}>
          <Plus size={18} /> Add image
        </button>
      )}
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Product images table">
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Alt text</th>
              <th>Position</th>
              <th className="actions-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="View image"
                    onClick={() => {
                      setSelected(row);
                      setAction('view');
                    }}
                  >
                    <Image
                      src={assetUrl(row.url)}
                      alt={row.alt || 'Product image'}
                      width={80}
                      height={60}
                      style={{ objectFit: 'contain' }}
                    />
                  </button>
                </td>
                <td>{row.alt || 'Product image'}</td>
                <td>{row.position}</td>
                <td className="actions-cell">
                  <div className="table-actions">
                    {(['view', ...(editable ? ['edit', 'delete'] : [])] as const).map((a) => (
                      <button
                        type="button"
                        key={a}
                        className={a === 'delete' ? 'icon-button error' : 'icon-button'}
                        title={a === 'edit' ? 'Edit / replace image' : a}
                        aria-label={`${a} image`}
                        onClick={() => {
                          setSelected(row);
                          setAction(a as 'view' | 'edit' | 'delete');
                          setError('');
                        }}
                      >
                        {a === 'view' ? (
                          <Eye size={18} />
                        ) : a === 'edit' ? (
                          <Pencil size={18} />
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4}>No images yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {action && (
        <Modal
          title={
            action === 'add'
              ? 'Add product image'
              : action === 'delete'
                ? 'Delete product image?'
                : action === 'edit'
                  ? 'Edit / replace image'
                  : 'Product image'
          }
          onClose={close}
        >
          {action === 'add' && <Upload bucket="product-images" entityId={productId} />}
          {action === 'view' && selected && (
            <Image
              src={assetUrl(selected.url)}
              alt={selected.alt || 'Product image'}
              width={900}
              height={650}
              style={{ objectFit: 'contain', height: 'auto', maxHeight: '70vh' }}
            />
          )}
          {action === 'edit' && selected && (
            <PopupCloseContext.Provider value={close}>
            <ActionForm action={productImage}>
              <input type="hidden" name="id" value={selected.id} />
              <input type="hidden" name="product_id" value={productId} />
              <VariantImage initialUrl={selected.url} fieldName="url" />
              <label className="field">
                Alt text
                <input name="alt" defaultValue={selected.alt} />
              </label>
              <label className="field">
                Position
                <input
                  name="position"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={selected.position}
                />
              </label>
            </ActionForm>
            </PopupCloseContext.Provider>
          )}
          {action === 'delete' && selected && (
            <>
              <p>Remove this image from the product? Other uses of the file will be preserved.</p>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <div className="row">
                <button
                  type="button"
                  className="button secondary"
                  disabled={pending}
                  onClick={close}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button danger"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const form = new FormData();
                      form.set('id', selected.id);
                      form.set('remove', 'true');
                      const result = await productImage({}, form);
                      if (result.error) setError(result.error);
                      else {
                        setAction(null);
                        setSelected(null);
                      }
                    })
                  }
                >
                  {pending ? 'Deleting…' : 'Delete image'}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
