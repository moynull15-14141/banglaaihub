// Mirrors the routing table in project-planning/12-frontend-architecture.md,
// plus the generic /resources routes added in Phase 9 for types that have no
// dedicated route (tutorial/prompt/project/news).
export const ROUTES = {
  home: '/',
  resources: '/resources',
  resource: (slug: string) => `/resources/${slug}`,
  datasets: '/datasets',
  dataset: (slug: string) => `/datasets/${slug}`,
  papers: '/papers',
  paper: (slug: string) => `/papers/${slug}`,
  tools: '/tools',
  tool: (slug: string) => `/tools/${slug}`,
  search: '/search',
  userProfile: (username: string) => `/users/${username}`,
  category: (slug: string) => `/categories/${slug}`,
  about: '/about',

  login: '/login',
  register: '/register',
  verifyEmail: '/verify-email',
  forgotPassword: '/forgot-password',

  dashboard: '/dashboard',
  submit: '/submit',
  bookmarks: '/bookmarks',
  notifications: '/notifications',
  settings: '/settings',
  settingsProfile: '/settings/profile',
  mySubmissions: '/my-submissions',

  admin: '/admin',
  adminPending: '/admin/pending',
  adminUsers: '/admin/users',
  adminReports: '/admin/reports',
} as const;

// Datasets/papers/tools have dedicated canonical routes per doc 12; every
// other resource type (tutorial/prompt/project/news) falls back to the
// generic /resources/[slug] route added in Phase 9.
export function resourceHref(type: string, slug: string): string {
  switch (type) {
    case 'dataset':
      return ROUTES.dataset(slug);
    case 'paper':
      return ROUTES.paper(slug);
    case 'tool':
      return ROUTES.tool(slug);
    default:
      return ROUTES.resource(slug);
  }
}
