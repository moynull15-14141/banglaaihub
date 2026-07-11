import type { MetadataRoute } from 'next';
import { listResources } from '@/lib/api/resources';
import { listCategories } from '@/lib/api/categories';
import { listTags } from '@/lib/api/tags';
import { searchUsers } from '@/lib/api/users';
import { ROUTES, resourceHref } from '@/lib/constants/routes';
import type { Category } from '@/types/category';

// Phase 5A-2 fix — the previous version called listResources() exactly once
// with limit:100, a hard cap on the newest 100 resources *combined across
// all 8 resource types*; anything older silently fell out of the sitemap as
// the catalog grew. This loops pages up to a bounded ceiling (not an
// unbounded crawl or a sitemap-index rebuild — over-engineering beyond a
// "fix", per the brief) and adds categories/tags/profiles, none of which
// were in the sitemap at all despite each having a real canonical URL.
const MAX_RESOURCE_PAGES = 20;
const RESOURCES_PER_PAGE = 100;

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [category, ...flattenCategories(category.children ?? [])]);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: appUrl, priority: 1.0 },
    { url: `${appUrl}/datasets`, priority: 0.9 },
    { url: `${appUrl}/papers`, priority: 0.9 },
    { url: `${appUrl}/tools`, priority: 0.9 },
    { url: `${appUrl}/articles`, priority: 0.9 },
    { url: `${appUrl}/search`, priority: 0.6 },
    { url: `${appUrl}/about`, priority: 0.3 },
  ];

  try {
    const resourceRoutes: MetadataRoute.Sitemap = [];
    for (let page = 1; page <= MAX_RESOURCE_PAGES; page += 1) {
      const { data: resources, meta } = await listResources({ sort: 'newest', limit: RESOURCES_PER_PAGE, page });
      resourceRoutes.push(
        ...resources.map((resource) => ({
          url: `${appUrl}${resourceHref(resource.type, resource.slug)}`,
          lastModified: resource.updated_at,
          priority: 0.8,
        })),
      );
      if (!meta.hasNextPage) break;
    }

    const [categories, tags, users] = await Promise.all([
      listCategories().catch(() => [] as Category[]),
      listTags().catch(() => []),
      searchUsers({ limit: 100 }).catch(() => ({ data: [], meta: {} })),
    ]);

    const categoryRoutes: MetadataRoute.Sitemap = flattenCategories(categories).map((category) => ({
      url: `${appUrl}${ROUTES.category(category.slug)}`,
      priority: 0.5,
    }));

    const tagRoutes: MetadataRoute.Sitemap = tags.map((tag) => ({
      url: `${appUrl}${ROUTES.tag(tag.slug)}`,
      priority: 0.4,
    }));

    const profileRoutes: MetadataRoute.Sitemap = (users.data as { username?: string }[])
      .filter((user): user is { username: string } => typeof user.username === 'string')
      .map((user) => ({
        url: `${appUrl}${ROUTES.userProfile(user.username)}`,
        priority: 0.4,
      }));

    return [...staticRoutes, ...resourceRoutes, ...categoryRoutes, ...tagRoutes, ...profileRoutes];
  } catch {
    // Backend/DB unreachable — still serve the static routes rather than a 500.
    return staticRoutes;
  }
}
