import { Database, FileText, Info, Search, Wrench } from 'lucide-react';
import { ROUTES } from '@/lib/constants/routes';

export const MAIN_NAV_LINKS = [
  { href: ROUTES.datasets, label: 'Datasets', icon: Database },
  { href: ROUTES.papers, label: 'Papers', icon: FileText },
  { href: ROUTES.tools, label: 'Tools', icon: Wrench },
  { href: ROUTES.search, label: 'Search', icon: Search },
  { href: ROUTES.about, label: 'About', icon: Info },
];
