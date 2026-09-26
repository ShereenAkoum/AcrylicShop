'use client';
import { useState, useTransition } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { deleteProduct, setProductActive } from '@/app/admin/product-actions';
import { categoryAction } from '@/app/admin/category-actions';
import { Modal } from './modal';

export function CategoryControls({ id, title, active, editable, toggle = false, resource = 'categories' }: {
  id: string; title: string; active: boolean; editable: boolean; toggle?: boolean; resource?: 'categories' | 'products';
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const run = (action: 'toggle' | 'delete') => start(async () => {
    setError('');
    const result = await (resource === 'products'
      ? action === 'toggle' ? setProductActive(id, !active) : deleteProduct(id)
      : categoryAction(id, action, !active));
    if (result.error) setError(result.error);
    else if (action === 'delete') setDeleteOpen(false);
  });
  return (
    <div className={toggle ? 'row' : 'table-actions'}>
      {toggle ? (
        <button type="button" role="switch" aria-checked={active} aria-label={`${title} active`} className="active-toggle" disabled={!editable || pending} onClick={() => run('toggle')}><span /></button>
      ) : (<>
        <Link className="icon-button" aria-label={`View ${title}`} title="View" href={`/admin/${resource}/${id}?view=1`}><Eye size={18} /></Link>
        {editable && (<>
          <Link className="icon-button" aria-label={`Edit ${title}`} title="Edit" href={`/admin/${resource}/${id}`}><Pencil size={18} /></Link>
          <button type="button" className="icon-button error" title="Delete" aria-label={`Delete ${title}`} disabled={pending} onClick={() => setDeleteOpen(true)}><Trash2 size={18} /></button>
        </>)}
      </>)}
      {error && !deleteOpen && <span role="alert" className="error">{error}</span>}
      {deleteOpen && (
        <Modal title={resource === 'products' ? 'Delete product?' : 'Delete category?'} onClose={() => setDeleteOpen(false)}>
          <div className="stack" style={{ textAlign: 'left' }}>
            <p>{resource === 'products' ? `Delete ${title}? Products with order history cannot be deleted.` : `Delete ${title}? Products will remain, without this category.`}</p>
            {error && <div role="alert" className="notice error">{error}</div>}
            <div className="row">
              <button type="button" className="button secondary" disabled={pending} onClick={() => setDeleteOpen(false)}>Cancel</button>
              <button type="button" className="button danger" disabled={pending} onClick={() => run('delete')}>{pending ? 'Deleting…' : resource === 'products' ? 'Delete product' : 'Delete category'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
