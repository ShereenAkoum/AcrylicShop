'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Modal } from './modal';
import { usePopupClose } from './popup-context';

export type Result = { error?: string; success?: string; href?: string };

export function ActionForm({ action, hideSubmit = false, children, label = 'Save', confirm, className = 'stack' }: {
  action: (state: Result, form: FormData) => Promise<Result>; children: ReactNode; label?: string; hideSubmit?: boolean; confirm?: string; className?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, {});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmed = useRef(false);
  const closePopup = usePopupClose();

  useEffect(() => {
    if (state.success) closePopup?.();
  }, [state.success, closePopup]);

  return (
    <>
      <form ref={formRef} action={dispatch} className={className} onSubmit={(e) => {
        if (confirm && !confirmed.current) {
          e.preventDefault();
          setConfirmOpen(true);
          return;
        }
        confirmed.current = false;
      }}>
        {children}
        {state.error && <div role="alert" className="notice error">{state.error}</div>}
        {state.success && (
          <div role="status" className="notice">
            {state.success}
            {state.href && <p><Link href={state.href}>Open saved record to continue →</Link></p>}
          </div>
        )}
        {!hideSubmit && <button className="button" disabled={pending}>{pending ? 'Saving…' : label}</button>}
      </form>
      {confirmOpen && confirm && (
        <Modal title="Confirm action" onClose={() => setConfirmOpen(false)}>
          <div className="stack" style={{ textAlign: 'left' }}>
            <p>{confirm}</p>
            <div className="row">
              <button type="button" className="button secondary" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button type="button" className="button danger" onClick={() => {
                confirmed.current = true;
                setConfirmOpen(false);
                formRef.current?.requestSubmit();
              }}>Confirm</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
