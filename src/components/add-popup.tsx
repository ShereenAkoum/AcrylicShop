'use client';
import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from './modal';
export function AddPopup({
  title,
  children,
  inline = false,
}: {
  title: string;
  children: ReactNode;
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {inline ? (
        children
      ) : (
        <>
          <div className="add-popup-trigger">
            <button
              type="button"
              className="button"
              title={title}
              aria-label={title}
              onClick={() => setOpen(true)}
            >
              <Plus size={18} />
              {title}
            </button>
          </div>
          {open && (
            <Modal title={title} onClose={() => setOpen(false)}>
              {children}
            </Modal>
          )}
        </>
      )}
    </>
  );
}
