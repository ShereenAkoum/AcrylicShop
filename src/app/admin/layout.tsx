import { SidebarLink, SidebarToggle } from '@/components/sidebar-controls';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Layers,
  Users,
  Globe,
  Truck,
  Wallet,
  BarChart3,
  Shield,
  Settings,
  ClipboardList,
} from 'lucide-react';
import { staff } from '@/lib/auth';
import { Brand } from '@/components/ui';
import { ThemeSwitch } from '@/components/theme';
import { logout } from '@/app/login/actions';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Workspace', robots: { index: false, follow: false } };
const links = [
  ['Dashboard', '', null, LayoutDashboard],
  ['Orders', 'orders', 'orders.view', ShoppingBag],
  ['Production', 'production', 'production.view', Layers],
  ['Design Library', 'designs', 'designs.view', Layers],
  ['Products', 'products', 'products.view', Package],
  ['Categories', 'categories', 'products.view', ClipboardList],
  ['Collections', 'collections', 'products.view', Layers],
  ['Inventory', 'inventory', 'inventory.view', Package],
  ['Customers', 'customers', 'customers.view', Users],
  ['Messages', 'inbox', 'customers.view', Users],
  ['Delivery', 'deliveries', 'deliveries.view', Truck],
  ['Payments', 'payments', 'payments.view', Wallet],
  ['Website', 'website', 'website.view', Globe],
  ['Reports', 'reports', 'reports.view', BarChart3],
  ['Users & Roles', 'users', 'users.view', Shield],
  ['Audit Log', 'audit', 'audit.view', ClipboardList],
  ['Settings', 'settings', 'settings.view', Settings],
] as const;
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await staff();
  return (
    <div className="admin">
      <aside className="sidebar">
        <Brand />
        <SidebarToggle />
        <nav aria-label="Workspace navigation">
          {links
            .filter((l) => !l[2] || session.permissions.includes(l[2]))
            .map(([label, path, , Icon]) => (
              <SidebarLink key={path} href={`/admin/${path}`}>
                <Icon size={17} />
                <span>{label}</span>
              </SidebarLink>
            ))}
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-header row between">
          <div>
            <p className="eyebrow" style={{ marginBottom: 4 }}>
              YAQEEN WORKSPACE
            </p>
            <span className="muted small">Thoughtful work. Meaningful things.</span>
          </div>
          <div className="row">
            <Link className="small" href="/admin/search">
              Search workspace
            </Link>
            <Link className="small" href="/">
              View store ↗
            </Link>
            <ThemeSwitch />
            <span className="small">{session.profile.full_name}</span>
            <form action={logout}>
              <button className="button secondary">Sign out</button>
            </form>
          </div>
        </header>
        <main id="main">{children}</main>
      </div>
    </div>
  );
}
