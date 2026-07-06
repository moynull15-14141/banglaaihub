import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { DashboardSidebarNav } from '@/components/layout/DashboardSidebarNav';
import { ROUTES } from '@/lib/constants/routes';

// Desktop-only fixed sidebar. The same nav is reused inside a Sheet for
// mobile — see DashboardTopbar.
export function DashboardSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      <Link
        href={ROUTES.home}
        className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4 font-semibold tracking-tight text-sidebar-foreground"
      >
        <span className="flex size-6 items-center justify-center rounded-md bg-brand text-brand-foreground">
          <Sparkles className="size-3.5" aria-hidden="true" />
        </span>
        Bangla AI Hub
      </Link>
      <DashboardSidebarNav />
    </aside>
  );
}
