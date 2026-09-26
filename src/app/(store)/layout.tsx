import Link from 'next/link';
import { Heart, Search, ShoppingBag } from 'lucide-react';
import { Brand } from '@/components/ui';
import { ThemeSwitch } from '@/components/theme';
import { document } from '@/lib/catalog';
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const nav = await document('navigation');
  const footer = await document('footer');
  const links = nav?.links || [
    { label: 'Home', url: '/' },
    { label: 'Shop', url: '/shop' },
    { label: 'Quran & Duas', url: '/categories/quran-duas' },
    { label: 'Desk Reminders', url: '/categories/desk-reminders' },
    { label: 'Gifts', url: '/collections/gifts' },
    { label: 'About', url: '/about' },
  ];
  return (
    <>
      <div className="announcement">
        {nav?.announcement || 'LITTLE REMINDERS. LASTING MEANING.'}
      </div>
      <header className="site-header">
        <div className="container row between">
          <Brand />
          <nav className="desktop-nav" aria-label="Main navigation">
            {links.map((l) => (
              <Link key={l.label} href={l.url}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="row header-actions">
            <Link className="icon-button" href="/search" aria-label="Search">
              <Search size={19} />
            </Link>
            <Link className="icon-button" href="/wishlist" aria-label="Wishlist">
              <Heart size={19} />
            </Link>
            <Link className="icon-button" href="/cart" aria-label="Cart">
              <ShoppingBag size={19} />
            </Link>
            <ThemeSwitch />
          </div>
        </div>
        <details className="mobile-menu container">
          <summary>Menu</summary>
          <nav>
            {links.map((l) => (
              <Link key={l.label} href={l.url}>
                {l.label}
              </Link>
            ))}
          </nav>
        </details>
      </header>
      <main id="main">{children}</main>
      <footer className="footer">
        <div className="container grid grid-3">
          <div>
            <Brand />
            <p className="muted small" style={{ marginTop: 24 }}>
              {footer?.body || 'Thoughtfully made. Meaningfully kept.'}
            </p>
          </div>
          <div>
            <p className="eyebrow">Explore</p>
            {(
              footer?.links || [
                { label: 'Our story', url: '/about' },
                { label: 'Contact', url: '/contact' },
                { label: 'FAQs', url: '/faq' },
                { label: 'Track your order', url: '/track-order' },
              ]
            ).map((l) => (
              <Link key={l.label} href={l.url}>
                {l.label}
              </Link>
            ))}
          </div>
          <div>
            <p className="eyebrow">A more meaningful life</p>
            <p className="muted">{footer?.contact_email}</p>
            <p className="muted">{footer?.contact_phone}</p>
            <ThemeSwitch />
            <Link href="/login">Staff sign in</Link>
          </div>
        </div>
        <div className="container small muted" style={{ marginTop: 36 }}>
          © {new Date().getFullYear()} YAQEEN / يقين
        </div>
      </footer>
    </>
  );
}
