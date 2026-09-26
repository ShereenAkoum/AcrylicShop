'use client';
import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './cart';
import { Field } from './ui';
import { money } from '@/lib/domain';
export function Checkout({ fee, currency }: { fee: number; currency: string }) {
  const { items, setItems } = useCart();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const router = useRouter();
  return (
    <form
      className="grid grid-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        setPending(true);
        const f = new FormData(e.currentTarget);
        try {
          let request = JSON.parse(sessionStorage.getItem('yaqeen-checkout') || 'null') as {
            request_id: string;
            token: string;
          } | null;
          if (!request) {
            request = {
              request_id: crypto.randomUUID(),
              token: Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
                b.toString(16).padStart(2, '0'),
              ).join(''),
            };
            sessionStorage.setItem('yaqeen-checkout', JSON.stringify(request));
          }
          const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...request,
              customer: Object.fromEntries(f),
              items: items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity })),
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          sessionStorage.setItem('yaqeen-order', JSON.stringify({ ...data, token: request.token }));
          sessionStorage.removeItem('yaqeen-checkout');
          setItems([]);
          router.push('/order-confirmation');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="card stack">
        <h2>Your details</h2>
        <Field name="full_name" label="Full name" required />
        <Field name="phone" label="Phone" type="tel" required />
        <Field name="email" label="Email (optional)" type="email" />
        <Field name="address" label="Delivery address" required />
        <Field name="city" label="Area / city" required />
        <Field name="instructions" label="Delivery instructions" />
        <Field name="notes" label="Order notes" />
      </div>
      <div className="card stack" style={{ alignSelf: 'start' }}>
        <h2>Your order</h2>
        {items.map((i) => (
          <div className="row between" key={i.variant_id}>
            <span>
              {i.title} × {i.quantity}
            </span>
            <span>{money(i.price * i.quantity, currency)}</span>
          </div>
        ))}
        <div className="row between">
          <span>Delivery</span>
          <span>{money(fee, currency)}</span>
        </div>
        <div className="row between">
          <strong>Estimated total</strong>
          <strong>
            {money(
              items.reduce((s, i) => s + i.price * i.quantity, fee),
              currency,
            )}
          </strong>
        </div>
        <p className="notice">Cash on Delivery · Pay when your order arrives.</p>
        <p className="muted small">
          Final prices and stock are checked securely when you place the order.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="button" disabled={pending || !items.length}>
          {pending ? 'Placing your order…' : 'Place order'}
        </button>
      </div>
    </form>
  );
}
export function Confirmation() {
  const raw = useSyncExternalStore(
    () => () => {},
    () => sessionStorage.getItem('yaqeen-order') || 'null',
    () => 'null',
  );
  const order = JSON.parse(raw) as {
    number: string;
    token: string;
    total: number;
    currency: string;
  } | null;
  return (
    <div className="card stack">
      {order ? (
        <>
          <h2>Thank you. Your reminder is on its way.</h2>
          <p>
            Order <strong>{order.number}</strong> · {money(order.total, order.currency)}
          </p>
          <label className="field">
            Private tracking code
            <input readOnly value={order.token} />
          </label>
          <p className="muted">
            Save this code and your order number. They let you track your order without sharing your
            personal details.
          </p>
          <Link className="button" href="/track-order">
            Track order
          </Link>
        </>
      ) : (
        <p>
          Your confirmation is available in the browser where you placed the order. Use your saved
          order number and tracking code to check its progress.
        </p>
      )}
    </div>
  );
}
export function Tracking() {
  const [result, setResult] = useState<{
    number: string;
    status: string;
    history: { status: string; created_at: string }[];
  } | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  return (
    <>
      <form
        className="card stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError('');
          setResult(null);
          const f = new FormData(e.currentTarget);
          try {
            const response = await fetch('/api/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(Object.fromEntries(f)),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setResult(data);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Tracking unavailable');
          } finally {
            setPending(false);
          }
        }}
      >
        <Field name="number" label="Order number" required />
        <Field name="token" label="Private tracking code" required />
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="button" disabled={pending}>
          {pending ? 'Checking…' : 'Track your order'}
        </button>
      </form>
      {result && (
        <div className="card" style={{ marginTop: 24 }}>
          <h2>
            {result.number} · {result.status}
          </h2>
          {result.history.map((h, i) => (
            <p key={i}>
              {h.status}{' '}
              <span className="muted small">{new Date(h.created_at).toLocaleString()}</span>
            </p>
          ))}
        </div>
      )}
    </>
  );
}
