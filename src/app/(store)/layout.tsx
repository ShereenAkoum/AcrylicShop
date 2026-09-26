import Link from 'next/link';
import { Heart, Menu, Search, ShoppingBag } from 'lucide-react';
import { Brand } from '@/components/ui';
import { document } from '@/lib/catalog';
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const nav = await document('navigation');
  const footer = await document('footer');
  const links = nav?.links || [
    { label: 'Home', url: '/' },
    { label: 'Shop', url: '/shop' },
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
            <details className="mobile-menu">
              <summary className="icon-button" aria-label="Open navigation menu">
                <Menu size={22} />
              </summary>
              <div className="mobile-menu-backdrop" />
              <div className="mobile-nav-drawer">
                <div className="mobile-nav-heading">Menu</div>
                <nav aria-label="Mobile navigation">
                  {links.map((l) => (
                    <Link key={l.label} href={l.url}>
                      {l.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </details>
          </div>
        </div>
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
