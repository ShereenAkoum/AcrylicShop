'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
export function SidebarLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const url = new URL(href, window.location.origin);
      void fetch(url.pathname, { method: 'GET', credentials: 'same-origin', priority: 'low' as RequestPriority });
    } catch {}
  }, [href]);
  const target = href.replace(/\/$/, '');
  const active = pathname === target || (target !== '/admin' && pathname.startsWith(`${target}/`));
  return (
    <Link href={href} aria-current={active ? 'page' : undefined}>
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
