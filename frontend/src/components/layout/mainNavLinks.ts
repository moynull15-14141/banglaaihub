import {
  BookOpen,
  Boxes,
  Database,
  FileText,
  Folder,
  FolderKanban,
  Info,
  MessageSquareText,
  Newspaper,
  NotebookText,
  Rss,
  Search,
  Wrench,
} from 'lucide-react';
import { ROUTES } from '@/lib/constants/routes';

// All 7 submittable resource types now have a dedicated browse page (Phase
// 2.3) — previously only dataset/paper/tool did, so tutorial/prompt/project/
// news were submittable but had no way to browse them by type. `model`
// added Phase 3A (Model Hub). `Categories` added Phase 3B (Discovery System)
// — the category taxonomy already had per-category pages, just no index.
// `Feed` added Phase 4D — the algorithmically-ranked cross-type surface,
// listed first since it's meant to be the daily-return destination.
export const MAIN_NAV_LINKS = [
  { href: ROUTES.feed, label: 'Feed', icon: Rss },
  { href: ROUTES.datasets, label: 'Datasets', icon: Database },
  { href: ROUTES.papers, label: 'Papers', icon: FileText },
  { href: ROUTES.tools, label: 'Tools', icon: Wrench },
  { href: ROUTES.models, label: 'Models', icon: Boxes },
  { href: ROUTES.tutorials, label: 'Tutorials', icon: BookOpen },
  { href: ROUTES.prompts, label: 'Prompts', icon: MessageSquareText },
  { href: ROUTES.projects, label: 'Projects', icon: FolderKanban },
  { href: ROUTES.news, label: 'News', icon: Newspaper },
  // Was never added to this list when the Articles CMS route shipped (Phase
  // 5A-1) — the /articles page and its listing worked fine, but a published
  // article was unreachable from any nav, only findable via a direct/shared
  // link or an internal admin link (e.g. the SEO preview panel).
  { href: ROUTES.articles, label: 'Articles', icon: NotebookText },
  { href: ROUTES.categories, label: 'Categories', icon: Folder },
  { href: ROUTES.search, label: 'Search', icon: Search },
  { href: ROUTES.about, label: 'About', icon: Info },
];

// The desktop navbar (see Navbar.tsx) has room for a handful of links
// before it starts fighting the logo/searchbar/avatar for space on a
// typical 1280–1440px laptop viewport — the full 11-item list only fits the
// mobile drawer (MobileMenu, which still renders every MAIN_NAV_LINKS
// entry). These six are the primary resource-browsing destinations; the
// rest live in the desktop nav's "More" dropdown.
export const PRIMARY_NAV_LINKS = MAIN_NAV_LINKS.slice(0, 5);
export const SECONDARY_NAV_LINKS = MAIN_NAV_LINKS.slice(5);
