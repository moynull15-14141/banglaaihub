'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react';
import { DASHBOARD_NAV_LINKS } from '@/components/layout/dashboardNavLinks';
import { canAccessAdminPanel } from '@/components/admin/adminNavLinks';
import { useAuth } from '@/lib/hooks/useAuth';
import { useContributorNavStatus } from '@/lib/hooks/useContributorNavStatus';
import { ROUTES } from '@/lib/constants/routes';
import { cn } from '@/lib/utils';

interface DashboardSidebarNavProps {
  onNavigate?: () => void;
}

function isActive(pathname: string, href: string): boolean {
  if (href === ROUTES.dashboard) return pathname === ROUTES.dashboard;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebarNav({ onNavigate }: DashboardSidebarNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const contributorNavStatus = useContributorNavStatus();

  // Only visible to whoever can see at least one admin page (per
  // adminNavLinks.ts), so this link never appears for someone who'd just hit
  // "Access restricted" on click.
  let links: { href: string; label: string; icon: LucideIcon }[] = DASHBOARD_NAV_LINKS;
  if (contributorNavStatus) {
    links = [
      ...links,
      { href: contributorNavStatus.href, label: contributorNavStatus.label, icon: Sparkles },
    ];
  }
  if (canAccessAdminPanel(user?.roles ?? [])) {
    links = [...links, { href: ROUTES.admin, label: 'Admin Panel', icon: ShieldCheck }];
  }

  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Dashboard navigation">
      {links.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
