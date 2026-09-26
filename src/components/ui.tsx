import Link from 'next/link';
import type { ReactNode } from 'react';
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Yaqeen home">
      <span className="arabic" lang="ar" dir="rtl">
        يقين
      </span>
      <span>YAQEEN</span>
      <small>A MORE MEANINGFUL LIFE</small>
    </Link>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <h3>A little space for what comes next.</h3>
      <div className="muted">{children}</div>
    </div>
  );
}
export function Title({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title row between">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}
export function Field({
  label,
  name,
  type = 'text',
  value,
  required = false,
  children,
}: {
  label: string;
  name: string;
  type?: string;
  value?: string | number;
  required?: boolean;
  children?: ReactNode;
}) {
  return (
    <label className="field">
      {label}
      {children || <input name={name} type={type} defaultValue={value} required={required} />}
    </label>
  );
}
