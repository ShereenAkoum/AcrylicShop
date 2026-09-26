'use client';
import { useState, useTransition } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { deleteProduct, setProductActive } from '@/app/admin/product-actions';
import { categoryAction } from '@/app/admin/category-actions';

export function CategoryControls({
  id,
  title,
  active,
  editable,
  toggle = false,
  resource = 'categories',
}: {
  id: string;
  title: string;
  active: boolean;
  editable: boolean;
  toggle?: boolean;
  resource?: 'categories' | 'products';
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const run = (action: 'toggle' | 'delete') =>
    start(async () => {
      setError('');
      const result = await (resource === 'products'
        ? action === 'toggle'
          ? setProductActive(id, !active)
          : deleteProduct(id)
        : categoryAction(id, action, !active));
      if (result.error) setError(result.error);
    });
  return (
    <div className={toggle ? 'row' : 'table-actions'}>
      {toggle ? (
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label={`${title} active`}
          className="active-toggle"
          disabled={!editable || pending}
          onClick={() => run('toggle')}
        >
          <span />
        </button>
      ) : (
        <>
          <Link
            className="icon-button"
            aria-label={`View ${title}`}
            title="View"
            href={`/admin/${resource}/${id}?view=1`}
          >
            <Eye size={18} />
          </Link>
          {editable && (
            <>
              <Link
                className="icon-button"
                aria-label={`Edit ${title}`}
                title="Edit"
                href={`/admin/${resource}/${id}`}
              >
                <Pencil size={18} />
              </Link>
              <button
                className="icon-button error"
                title="Delete"
                aria-label={`Delete ${title}`}
                disabled={pending}
                onClick={() => {
                  if (
                    window.confirm(
                      resource === 'products'
                        ? `Delete ${title}? Products with order history cannot be deleted.`
                        : `Delete ${title}? Products will remain, without this category.`,
                    )
                  )
                    run('delete');
                }}
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        </>
      )}
      {error && (
        <span role="alert" className="error">
          {error}
        </span>
      )}
    </div>
  );
}
