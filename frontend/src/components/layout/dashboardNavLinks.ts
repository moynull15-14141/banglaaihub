import {
  Bell,
  Bookmark,
  FileStack,
  LayoutDashboard,
  Settings,
  UploadCloud,
  User,
} from 'lucide-react';
import { ROUTES } from '@/lib/constants/routes';

export const DASHBOARD_NAV_LINKS = [
  { href: ROUTES.dashboard, label: 'Dashboard', icon: LayoutDashboard },
  { href: ROUTES.submit, label: 'Submit', icon: UploadCloud },
  { href: ROUTES.mySubmissions, label: 'My Submissions', icon: FileStack },
  { href: ROUTES.bookmarks, label: 'Bookmarks', icon: Bookmark },
  { href: ROUTES.notifications, label: 'Notifications', icon: Bell },
  { href: ROUTES.profile, label: 'Profile', icon: User },
  { href: ROUTES.settings, label: 'Settings', icon: Settings },
];
