'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
export function SidebarLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const target = href.replace(/\/$/, '');
  const active = pathname === target || (target !== '/admin' && pathname.startsWith(`${target}/`));
  useEffect(() => {
    router.prefetch(href);
  }, [href, router]);
  return (
    <Link href={href} prefetch aria-current={active ? 'page' : undefined}>
      {children}
    </Link>
  );
}
export function SidebarToggle() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <button
      className="icon-button sidebar-toggle"
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-expanded={!collapsed}
      onClick={() => setCollapsed(!collapsed)}
    >
      {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
    </button>
  );
}
