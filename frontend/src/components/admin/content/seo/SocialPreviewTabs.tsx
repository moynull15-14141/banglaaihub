'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROUTES } from '@/lib/constants/routes';

interface SocialPreviewTabsProps {
  title: string;
  description: string;
  imageUrl: string | null;
  slug: string;
}

// Live mockups of how the current OpenGraph data (already generated
// automatically in app/(public)/articles/[slug]/page.tsx's generateMetadata)
// would render on each platform's link-unfurl card — purely presentational,
// built from the same in-memory editor state as GoogleSearchPreview, no new
// backend call.
export function SocialPreviewTabs({ title, description, imageUrl, slug }: SocialPreviewTabsProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const url = `${appUrl}${ROUTES.article(slug || 'your-article-slug')}`;
  const hostname = appUrl.replace(/^https?:\/\//, '') || 'banglaaihub.com';
  const displayTitle = title || 'Your article title';
  const displayDescription = description || 'Your meta description will appear here.';

  const platforms = ['facebook', 'linkedin', 'twitter', 'discord', 'whatsapp', 'telegram'] as const;
  const labels: Record<(typeof platforms)[number], string> = {
    facebook: 'Facebook',
    linkedin: 'LinkedIn',
    twitter: 'Twitter / X',
    discord: 'Discord',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
  };

  function Card({ compact }: { compact?: boolean }) {
    return (
      <div className="overflow-hidden rounded-lg border border-border/60">
        <div className="flex aspect-[1.91/1] items-center justify-center bg-muted">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary signed/external preview image
            <img src={imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-xs text-muted-foreground">No image set</span>
          )}
        </div>
        <div className="p-3">
          <p className="truncate text-xs text-muted-foreground uppercase">{hostname}</p>
          <p className={`mt-0.5 truncate font-medium ${compact ? 'text-sm' : 'text-base'}`}>{displayTitle}</p>
          {!compact ? <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{displayDescription}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="facebook">
      <TabsList>
        {platforms.map((platform) => (
          <TabsTrigger key={platform} value={platform}>
            {labels[platform]}
          </TabsTrigger>
        ))}
      </TabsList>
      {platforms.map((platform) => (
        <TabsContent key={platform} value={platform} className="mt-3 max-w-sm">
          <Card compact={platform === 'discord' || platform === 'whatsapp' || platform === 'telegram'} />
          <p className="mt-1 truncate text-xs text-muted-foreground">{url}</p>
        </TabsContent>
      ))}
    </Tabs>
  );
}
