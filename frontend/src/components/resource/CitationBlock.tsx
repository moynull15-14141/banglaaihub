'use client';

import { useState } from 'react';
import { Check, Copy, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CitationBlockProps {
  title: string;
  authorName: string | null;
  publishedAt: string | null;
  url: string;
  license: string | null;
}

function buildCitation(title: string, authorName: string | null, publishedAt: string | null, url: string): string {
  const year = publishedAt ? new Date(publishedAt).getFullYear() : new Date().getFullYear();
  const author = authorName ?? 'Bangla AI Hub Community';
  return `${author}. (${year}). ${title}. Bangla AI Hub. ${url}`;
}

export function CitationBlock({ title, authorName, publishedAt, url, license }: CitationBlockProps) {
  const [copied, setCopied] = useState(false);
  const citation = buildCitation(title, authorName, publishedAt, url);

  if (!license && !citation) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable — non-critical, user can select the text manually.
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/60 p-4">
      {license ? (
        <div className="flex items-center gap-2 text-sm">
          <Scale className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-muted-foreground">License</span>
          <span className="font-medium">{license}</span>
        </div>
      ) : null}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Cite this resource</p>
        <div className="flex items-start justify-between gap-2 rounded-lg bg-muted/50 p-3">
          <code className="min-w-0 flex-1 text-xs break-words whitespace-pre-wrap">{citation}</code>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Copy citation" onClick={() => void handleCopy()}>
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
