import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto bg-muted/30">{children}</main>
      </div>
    </div>
  );
}
