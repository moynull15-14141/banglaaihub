'use client';

import { useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants/routes';

interface GoogleSearchPreviewProps {
  title: string;
  description: string;
  slug: string;
}

// Live, purely presentational preview of Google's SERP snippet shape — no
// backend call, just the same title/description/URL already live in the
// editor's form state. Truncation limits (title ~60 chars, description
// ~160 chars) mirror Google's typical desktop display width.
export function GoogleSearchPreview({ title, description, slug }: GoogleSearchPreviewProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const url = `${appUrl}${ROUTES.article(slug || 'your-article-slug')}`;
  const displayTitle = title.length > 60 ? `${title.slice(0, 57)}…` : title || 'Your article title';
  const displayDescription =
    description.length > 160 ? `${description.slice(0, 157)}…` : description || 'Your meta description will appear here.';

  return (
    <div>
      <div className="mb-2 flex gap-1" role="tablist" aria-label="Preview device">
        <Button
          type="button"
          variant={device === 'desktop' ? 'secondary' : 'ghost'}
          size="xs"
          role="tab"
          aria-selected={device === 'desktop'}
          onClick={() => setDevice('desktop')}
        >
          <Monitor className="size-3" aria-hidden="true" />
          Desktop
        </Button>
        <Button
          type="button"
          variant={device === 'mobile' ? 'secondary' : 'ghost'}
          size="xs"
          role="tab"
          aria-selected={device === 'mobile'}
          onClick={() => setDevice('mobile')}
        >
          <Smartphone className="size-3" aria-hidden="true" />
          Mobile
        </Button>
      </div>
      <div className={`rounded-lg border border-border/60 bg-background p-4 font-sans ${device === 'mobile' ? 'max-w-xs' : ''}`}>
        <p className="truncate text-sm text-[#202124] dark:text-neutral-300">{url}</p>
        <p className="mt-1 truncate text-lg text-[#1a0dab] dark:text-[#8ab4f8]">{displayTitle}</p>
        <p className="mt-1 text-sm text-[#4d5156] dark:text-neutral-400">{displayDescription}</p>
      </div>
    </div>
  );
}
