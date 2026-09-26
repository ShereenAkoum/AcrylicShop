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
  const savedValues = useRef<Map<string, string | boolean>>(new Map());
  const closePopup = usePopupClose();

  useEffect(() => {
    if (state.error && formRef.current) {
      for (const element of Array.from(formRef.current.elements)) {
        if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) || !element.name) continue;
        const value = savedValues.current.get(element.name);
        if (value === undefined) continue;
        if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) element.checked = Boolean(value);
        else element.value = String(value);
      }
    }
    if (state.success) closePopup?.();
  }, [state.error, state.success, closePopup]);

  return (
    <>
      <form ref={formRef} action={dispatch} className={className} onSubmit={(e) => {
        if (confirm && !confirmed.current) {
          e.preventDefault();
          setConfirmOpen(true);
          return;
        }
        confirmed.current = false;
        savedValues.current.clear();
        if (formRef.current) {
          for (const element of Array.from(formRef.current.elements)) {
            if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) || !element.name) continue;
            savedValues.current.set(element.name, element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio') ? element.checked : element.value);
          }
        }
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
