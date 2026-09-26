import { assetUrl } from '@/lib/assets';
import Image from 'next/image';
import Link from 'next/link';
import { money, type Product } from '@/lib/domain';
export function Artwork({ phrase = 'يقين' }: { phrase?: string }) {
  return (
    <div className="placeholder">
      <span className="arabic" dir="rtl" lang="ar">
        {phrase}
      </span>
      <small>YAQEEN</small>
    </div>
  );
}
export function ProductCard({ product: p }: { product: Product }) {
  const image = p.product_images.sort((a, b) => a.position - b.position)[0];
  return (
    <Link className="product-card" href={`/products/${p.slug}`}>
      <div className="product-image">
        {image ? (
          <Image
            src={assetUrl(image.url)}
            alt={image.alt || p.title}
            fill
            sizes="(max-width:760px) 45vw, 25vw"
          />
        ) : (
          <Artwork phrase={p.arabic_title || 'يقين'} />
        )}{' '}
        {p.bestseller && <span className="badge">Much loved</span>}
      </div>
      <h3>{p.title}</h3>
      <div className="row between">
        <span className="muted small">{p.shape} acrylic reminder</span>
        <span>{money(p.price)}</span>
      </div>
    </Link>
  );
}
