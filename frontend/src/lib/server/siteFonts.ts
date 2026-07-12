// Server-only fetch for the Site Font Engine — deliberately NOT going
// through lib/api/client.ts's apiClient, which reads the access token from a
// browser-only Zustand store and can't run in a Server Component. Uses
// Next's fetch cache tags instead: revalidate: 3600 is a 1-hour safety-net
// TTL, and app/api/revalidate-fonts/route.ts busts the 'site-fonts' tag the
// moment an admin saves, so the change is live for new requests immediately
// without waiting out the TTL.
export type FontSlot = 'sans' | 'heading' | 'mono';
export type FontStyle = 'normal' | 'italic';

export interface SiteFontFile {
  weight: number;
  style: FontStyle;
  format: string;
  url: string | null;
}

export interface SiteFont {
  slot: FontSlot;
  source: 'google' | 'custom';
  family: string;
  fallback: string;
  css_url: string | null;
  files: SiteFontFile[];
}

export async function getActiveFontsForLayout(): Promise<SiteFont[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/site-settings/fonts`, {
      next: { tags: ['site-fonts'], revalidate: 3600 },
    });
    if (!response.ok) return [];
    const body = (await response.json()) as { data?: SiteFont[] };
    return body.data ?? [];
  } catch {
    // Fail open — a backend hiccup during a page render should never take
    // typography (and therefore the whole page) down with it. Falls back to
    // the next/font Geist defaults already baked into layout.tsx.
    return [];
  }
}
