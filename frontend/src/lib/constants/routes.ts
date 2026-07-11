// Mirrors the routing table in project-planning/12-frontend-architecture.md,
// plus the generic /resources routes added in Phase 9 for types that have no
// dedicated route (tutorial/prompt/project/news). Phase 2.3 gave those 4
// types their own listing pages too (browse-by-type + navbar entries) —
// their individual items still resolve through /resources/[slug] (see
// resourceHref below), only the listing URL is dedicated.
export const ROUTES = {
  home: '/',
  feed: '/feed',
  resources: '/resources',
  resource: (slug: string) => `/resources/${slug}`,
  datasets: '/datasets',
  dataset: (slug: string) => `/datasets/${slug}`,
  papers: '/papers',
  paper: (slug: string) => `/papers/${slug}`,
  tools: '/tools',
  tool: (slug: string) => `/tools/${slug}`,
  models: '/models',
  model: (slug: string) => `/models/${slug}`,
  articles: '/articles',
  article: (slug: string) => `/articles/${slug}`,
  tutorials: '/tutorials',
  prompts: '/prompts',
  prompt: (slug: string) => `/prompts/${slug}`,
  projects: '/projects',
  news: '/news',
  search: '/search',
  userProfile: (username: string) => `/users/${username}`,
  userFollowers: (username: string) => `/users/${username}/followers`,
  userFollowing: (username: string) => `/users/${username}/following`,
  categories: '/categories',
  category: (slug: string) => `/categories/${slug}`,
  tag: (slug: string) => `/tags/${slug}`,
  about: '/about',

  login: '/login',
  register: '/register',
  verifyEmail: '/verify-email',
  forgotPassword: '/forgot-password',

  dashboard: '/dashboard',
  profile: '/profile',
  submit: '/submit',
  bookmarks: '/bookmarks',
  notifications: '/notifications',
  settings: '/settings',
  settingsProfile: '/settings/profile',
  mySubmissions: '/my-submissions',
  editResource: (slug: string) => `/my-submissions/${slug}/edit`,
  contributorApplication: '/contributor-application',

  admin: '/admin',
  adminPending: '/admin/pending',
  adminUsers: '/admin/users',
  adminReports: '/admin/reports',
  adminBadges: '/admin/badges',
  adminCategories: '/admin/categories',
  adminContributorApplications: '/admin/contributor-applications',
  adminContributorApplication: (id: string) => `/admin/contributor-applications/${id}`,
  adminSearchAnalytics: '/admin/search-analytics',
  adminFeed: '/admin/feed',
  adminContentArticles: '/admin/content/articles',
  adminContentArticleNew: '/admin/content/articles/new',
  adminContentArticleEdit: (slug: string) => `/admin/content/articles/${slug}/edit`,
  adminContentSeo: '/admin/content/seo',
  adminContentEditorial: '/admin/content/editorial',
  adminContentCalendar: '/admin/content/calendar',
  adminContentScheduleQueue: '/admin/content/schedule-queue',

  terms: '/terms',
  privacy: '/privacy',
  support: '/support',
  unauthorized: '/401',
  forbidden: '/403',
  // Next.js reserves the literal /500 path for its own static-export
  // artifact (like /404), so a real App Router page there collides at
  // build time — this lives at /server-error instead.
  serverError: '/server-error',
} as const;

// Datasets/papers/tools/models/prompts have dedicated canonical routes per
// doc 12; every other resource type (tutorial/project/news) falls back to
// the generic /resources/[slug] route added in Phase 9.
export function resourceHref(type: string, slug: string): string {
  switch (type) {
    case 'dataset':
      return ROUTES.dataset(slug);
    case 'paper':
      return ROUTES.paper(slug);
    case 'tool':
      return ROUTES.tool(slug);
    case 'model':
      return ROUTES.model(slug);
    case 'prompt':
      return ROUTES.prompt(slug);
    case 'article':
      return ROUTES.article(slug);
    default:
      return ROUTES.resource(slug);
  }
}
