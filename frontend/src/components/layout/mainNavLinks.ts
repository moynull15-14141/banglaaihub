import {
  BookOpen,
  Database,
  FileText,
  FolderKanban,
  Info,
  MessageSquareText,
  Newspaper,
  Search,
  Wrench,
} from 'lucide-react';
import { ROUTES } from '@/lib/constants/routes';

// All 7 submittable resource types now have a dedicated browse page (Phase
// 2.3) — previously only dataset/paper/tool did, so tutorial/prompt/project/
// news were submittable but had no way to browse them by type.
export const MAIN_NAV_LINKS = [
  { href: ROUTES.datasets, label: 'Datasets', icon: Database },
  { href: ROUTES.papers, label: 'Papers', icon: FileText },
  { href: ROUTES.tools, label: 'Tools', icon: Wrench },
  { href: ROUTES.tutorials, label: 'Tutorials', icon: BookOpen },
  { href: ROUTES.prompts, label: 'Prompts', icon: MessageSquareText },
  { href: ROUTES.projects, label: 'Projects', icon: FolderKanban },
  { href: ROUTES.news, label: 'News', icon: Newspaper },
  { href: ROUTES.search, label: 'Search', icon: Search },
  { href: ROUTES.about, label: 'About', icon: Info },
];
