'use client';

import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLogResourceShare } from '@/lib/hooks/useResources';

// Plain intent URLs — no external SDKs/packages, per the instructions.
function shareLinks(url: string, title: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
  };
}

interface ShareButtonsProps {
  slug: string;
  url: string;
  title: string;
}

// Every share action (social intent click or copy-link) logs a
// ResourceAnalytics 'share' event via the existing POST /resources/:slug/share
// endpoint — fire-and-forget, never blocks the actual share.
export function ShareButtons({ slug, url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const logShare = useLogResourceShare();
  const links = shareLinks(url, title);

  function track() {
    logShare.mutate(slug);
  }

  function openShareWindow(href: string) {
    track();
    window.open(href, '_blank', 'noopener,noreferrer,width=600,height=500');
  }

  async function copyLink() {
    track();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (insecure context, permissions) —
      // the share event is still logged even if the copy itself fails.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Share this resource">
      <Button type="button" variant="outline" size="sm" onClick={() => openShareWindow(links.facebook)}>
        Facebook
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => openShareWindow(links.linkedin)}>
        LinkedIn
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => openShareWindow(links.x)}>
        X
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => void copyLink()}>
        {copied ? (
          <>
            <Check className="size-4" aria-hidden="true" />
            Copied
          </>
        ) : (
          <>
            <Link2 className="size-4" aria-hidden="true" />
            Copy link
          </>
        )}
      </Button>
    </div>
  );
}
