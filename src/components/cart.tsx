'use client';
import { assetUrl } from '@/lib/assets';

import { useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { money, type Product } from '@/lib/domain';
import { Artwork } from './product-card';
export type CartItem = {
  variant_id: string;
  product_id: string;
  slug: string;
  title: string;
  options: string;
  image: string | null;
  price: number;
  quantity: number;
};
const subscribe = (callback: () => void) => {
  window.addEventListener('cartchange', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('cartchange', callback);
    window.removeEventListener('storage', callback);
  };
};
export function useCart() {
  const raw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem('yaqeen-cart') || '[]',
    () => '[]',
  );
  let items: CartItem[] = [];
  try {
    items = JSON.parse(raw);
  } catch {}
  return {
    items,
    setItems: (next: CartItem[]) => {
      localStorage.setItem('yaqeen-cart', JSON.stringify(next));
      window.dispatchEvent(new Event('cartchange'));
    },
  };
}
export function ProductPurchase({ product: p }: { product: Product }) {
  const variants = p.product_variants.filter((v) => v.active);
  const [id, setId] = useState(variants[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState('');
  const [gallery, setGallery] = useState<string | null>(null);
  const { items, setItems } = useCart();
  const v = variants.find((v) => v.id === id);
  const image = gallery || v?.image_url || p.product_images[0]?.url;
  return (
    <div className="grid grid-2 section">
      <div>
        <div className="product-image" style={{ aspectRatio: 1 }}>
          {image ? (
            <Image
              src={assetUrl(image)}
              alt={p.title}
              fill
              sizes="(max-width:760px) 90vw, 45vw"
              priority
            />
          ) : (
            <Artwork phrase={p.arabic_title} />
          )}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          {p.product_images.map((i) => (
            <button key={i.id} className="button secondary" onClick={() => setGallery(i.url)}>
              {i.alt || 'View image'}
            </button>
          ))}
        </div>
      </div>
      <div className="stack">
        <p className="eyebrow">A LITTLE REMINDER, EVERY DAY</p>
        <h1 style={{ fontSize: 44 }}>{p.title}</h1>
        {p.arabic_title && (
          <p className="arabic" dir="rtl" lang="ar" style={{ fontSize: 36 }}>
            {p.arabic_title}
          </p>
        )}
        {p.transliteration && <i>{p.transliteration}</i>}
        {p.translation && <p className="muted">{p.translation}</p>}
        <div className="row">
          <strong style={{ fontSize: 24 }}>{money(v?.price_override ?? p.price)}</strong>
          {p.compare_at_price && <del className="muted">{money(p.compare_at_price)}</del>}
        </div>
        <p className="muted">{p.description}</p>
        <label className="field">
          Color / size / stand
          <select
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setGallery(null);
              setQuantity(1);
            }}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.color} · {v.size} · {v.stand}
              </option>
            ))}
          </select>
        </label>
        <p className="small muted">
          SKU: {v?.sku || p.sku} · {v?.stock ? `${v.stock} available` : 'Currently unavailable'}
        </p>
        <label className="field">
          Quantity
          <input
            type="number"
            min={1}
            max={Math.min(v?.stock || 1, 99)}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(99, Number(e.target.value))))}
          />
        </label>
        <div className="row">
          <button
            className="button"
            disabled={!v || v.stock < quantity}
            onClick={() => {
              if (!v) return;
              const existing = items.find((i) => i.variant_id === v.id);
              if ((existing?.quantity || 0) + quantity > Math.min(v.stock, 99)) {
                setNotice('You have reached the available quantity.');
                return;
              }
              setItems(
                existing
                  ? items.map((i) =>
                      i.variant_id === v.id ? { ...i, quantity: i.quantity + quantity } : i,
                    )
                  : [
                      ...items,
                      {
                        variant_id: v.id,
                        product_id: p.id,
                        slug: p.slug,
                        title: p.title,
                        options: `${v.color} · ${v.size} · ${v.stand}`,
                        image: image || null,
                        price: v.price_override ?? p.price,
                        quantity,
                      },
                    ],
              );
              setNotice('Added to your bag.');
            }}
          >
            Add to bag
          </button>
          <button
            className="button secondary"
            onClick={() => {
              const list: string[] = JSON.parse(localStorage.getItem('yaqeen-wishlist') || '[]');
              localStorage.setItem(
                'yaqeen-wishlist',
                JSON.stringify([...new Set([...list, p.slug])]),
              );
              setNotice('Saved to your wishlist.');
            }}
          >
            ♡ Save
          </button>
        </div>
        {notice && (
          <p role="status" className="notice">
            {notice} <Link href="/cart">View bag →</Link>
          </p>
        )}
        <details>
          <summary>Product information</summary>
          <p>
            {p.shape} acrylic · {v?.size} · {v?.stand}. Handle with care and clean with a soft
            cloth.
          </p>
        </details>
        <details>
          <summary>Shipping & payment</summary>
          <p>
            Cash on delivery. Delivery fee is calculated at checkout. Your order is prepared after
            confirmation.
          </p>
        </details>
      </div>
    </div>
  );
}
export function Cart() {
  const { items, setItems } = useCart();
  return (
    <div className="stack">
      {!items.length ? (
        <p className="empty">
          Your bag is waiting for something meaningful.{' '}
          <Link href="/shop">Explore the collection →</Link>
        </p>
      ) : (
        <>
          {items.map((i) => (
            <div className="card row between" key={i.variant_id}>
              <div>
                <Link href={`/products/${i.slug}`}>
                  <strong>{i.title}</strong>
                </Link>
                <p className="muted small">{i.options}</p>
                <span>{money(i.price)}</span>
              </div>
              <div className="row">
                <input
                  className="control"
                  style={{ width: 90 }}
                  aria-label={`Quantity of ${i.title}`}
                  type="number"
                  min={1}
                  max={99}
                  value={i.quantity}
                  onChange={(e) =>
                    setItems(
                      items.map((x) =>
                        x.variant_id === i.variant_id
                          ? { ...x, quantity: Math.min(99, Math.max(1, Number(e.target.value))) }
                          : x,
                      ),
                    )
                  }
                />
                <button
                  className="button secondary"
                  onClick={() => setItems(items.filter((x) => x.variant_id !== i.variant_id))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <div className="card row between">
            <div>
              Subtotal{' '}
              <strong>{money(items.reduce((sum, i) => sum + i.price * i.quantity, 0))}</strong>
              <p className="small muted">
                Prices and availability are confirmed at checkout. Delivery is added there.
              </p>
            </div>
            <Link className="button" href="/checkout">
              Continue to checkout →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
export function Wishlist() {
  const raw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem('yaqeen-wishlist') || '[]',
    () => '[]',
  );
  let slugs: string[] = [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) slugs = parsed.filter((s): s is string => typeof s === 'string');
  } catch {}
  function setSlugs(next: string[]) {
    localStorage.setItem('yaqeen-wishlist', JSON.stringify(next));
    window.dispatchEvent(new Event('cartchange'));
  }
  return (
    <div className="stack">
      {slugs.length ? (
        slugs.map((slug) => (
          <div className="card row between" key={slug}>
            <Link href={`/products/${slug}`}>{slug.replaceAll('-', ' ')} →</Link>
            <button
              className="button secondary"
              onClick={() => {
                const next = slugs.filter((s) => s !== slug);
                setSlugs(next);
                localStorage.setItem('yaqeen-wishlist', JSON.stringify(next));
              }}
            >
              Remove
            </button>
          </div>
        ))
      ) : (
        <p className="empty">No saved reminders yet.</p>
      )}
    </div>
  );
}
