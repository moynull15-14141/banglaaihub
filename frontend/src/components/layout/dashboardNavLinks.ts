import {
  Bell,
  Bookmark,
  FileStack,
  LayoutDashboard,
  Settings,
  UploadCloud,
  User,
  Wallet,
} from 'lucide-react';
import { ROUTES } from '@/lib/constants/routes';

export const DASHBOARD_NAV_LINKS = [
  { href: ROUTES.dashboard, label: 'Dashboard', icon: LayoutDashboard },
  { href: ROUTES.submit, label: 'Submit', icon: UploadCloud },
  { href: ROUTES.mySubmissions, label: 'My Submissions', icon: FileStack },
  { href: ROUTES.bookmarks, label: 'Bookmarks', icon: Bookmark },
  // Paid Resource Downloads (Phase C) — every user has a wallet (even a
  // non-contributor could hold a $0 balance), so this stays unconditional,
  // same as Bookmarks/Notifications above rather than being gated behind a
  // contributor-only check.
  { href: ROUTES.settingsWallet, label: 'Wallet', icon: Wallet },
  { href: ROUTES.notifications, label: 'Notifications', icon: Bell },
  { href: ROUTES.profile, label: 'Profile', icon: User },
  { href: ROUTES.settings, label: 'Settings', icon: Settings },
];
