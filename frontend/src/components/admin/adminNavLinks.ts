import { ClipboardList, Flag, LayoutDashboard, Users } from 'lucide-react';
import { ROUTES } from '@/lib/constants/routes';

export const ADMIN_NAV_LINKS = [
  { href: ROUTES.admin, label: 'Dashboard', icon: LayoutDashboard },
  { href: ROUTES.adminPending, label: 'Pending Approvals', icon: ClipboardList },
  { href: ROUTES.adminUsers, label: 'Users', icon: Users },
  { href: ROUTES.adminReports, label: 'Reports', icon: Flag },
];
