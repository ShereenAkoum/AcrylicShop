'use client';
import { useActionState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
export type Result = { error?: string; success?: string; href?: string };
export function ActionForm({
  action,
  hideSubmit = false,
  children,
  label = 'Save',
  confirm,
  className = 'stack',
}: {
  action: (state: Result, form: FormData) => Promise<Result>;
  children: ReactNode;
  label?: string;
  hideSubmit?: boolean;
  confirm?: string;
  className?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, {});
  return (
    <form
      action={dispatch}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state.error && (
        <div role="alert" className="notice error">
          {state.error}
        </div>
      )}
      {state.success && (
        <div role="status" className="notice">
          {state.success}
          {state.href && (
            <p>
              <Link href={state.href}>Open saved record to continue →</Link>
            </p>
          )}
        </div>
      )}
      {!hideSubmit && (
        <button className="button" disabled={pending}>
          {pending ? 'Saving…' : label}
        </button>
      )}
    </form>
  );
}
