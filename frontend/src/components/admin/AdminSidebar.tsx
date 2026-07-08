import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { AdminSidebarNav } from '@/components/admin/AdminSidebarNav';
import { ROUTES } from '@/lib/constants/routes';

// Desktop-only fixed sidebar. The same nav is reused inside a Sheet for
// mobile — see AdminTopbar.
export function AdminSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      <Link
        href={ROUTES.admin}
        className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4 font-semibold tracking-tight text-sidebar-foreground"
      >
        <span className="flex size-6 items-center justify-center rounded-md bg-brand text-brand-foreground">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
        </span>
        Admin
      </Link>
      <AdminSidebarNav />
    </aside>
  );
}
