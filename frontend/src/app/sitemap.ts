import type { MetadataRoute } from 'next';
import { listResources } from '@/lib/api/resources';
import { resourceHref } from '@/lib/constants/routes';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: appUrl, priority: 1.0 },
    { url: `${appUrl}/datasets`, priority: 0.9 },
    { url: `${appUrl}/papers`, priority: 0.9 },
    { url: `${appUrl}/tools`, priority: 0.9 },
    { url: `${appUrl}/search`, priority: 0.6 },
    { url: `${appUrl}/about`, priority: 0.3 },
  ];

  try {
    const { data: resources } = await listResources({ sort: 'newest', limit: 100 });
    const resourceRoutes: MetadataRoute.Sitemap = resources.map((resource) => ({
      url: `${appUrl}${resourceHref(resource.type, resource.slug)}`,
      lastModified: resource.updated_at,
      priority: 0.8,
    }));
    return [...staticRoutes, ...resourceRoutes];
  } catch {
    // Backend/DB unreachable — still serve the static routes rather than a 500.
    return staticRoutes;
  }
}
