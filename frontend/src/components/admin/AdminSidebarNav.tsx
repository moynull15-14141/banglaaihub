'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getVisibleAdminNavLinks } from '@/components/admin/adminNavLinks';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAdminContributorApplications } from '@/lib/hooks/useAdmin';
import { ROUTES } from '@/lib/constants/routes';
import { cn } from '@/lib/utils';

interface AdminSidebarNavProps {
  onNavigate?: () => void;
}

function isActive(pathname: string, href: string): boolean {
  if (href === ROUTES.admin) return pathname === ROUTES.admin;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebarNav({ onNavigate }: AdminSidebarNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const links = getVisibleAdminNavLinks(user?.roles ?? []);

  // Same permission (contributor_application:review) gates this link and the
  // query, so this never fires for someone who can't see the link anyway.
  const showContributorBadge = links.some((link) => link.href === ROUTES.adminContributorApplications);
  const { data: pendingApplications } = useAdminContributorApplications(
    { status: 'pending', limit: 1 },
    showContributorBadge,
  );
  const pendingCount = pendingApplications?.meta.total ?? 0;

  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Admin navigation">
      {links.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        const badgeCount = href === ROUTES.adminContributorApplications ? pendingCount : 0;
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
            {badgeCount > 0 ? (
              <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-xs text-brand-foreground">
                {badgeCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
