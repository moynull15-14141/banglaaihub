'use client';

import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { SearchBar } from '@/components/search/SearchBar';
import { ROUTES } from '@/lib/constants/routes';

export function Hero() {
  const router = useRouter();

  return (
    <section className="relative overflow-hidden border-b">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 0%, color-mix(in oklch, var(--brand), transparent 88%), transparent)',
        }}
        aria-hidden="true"
      />
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-20 text-center sm:py-24">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Built by the Bengali AI community
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Bangla AI Hub
        </h1>
        <p className="text-lg text-balance text-muted-foreground">
          Discover Bangla-language datasets, research papers, tools, and tutorials — built by and
          for the Bengali AI community.
        </p>
        <SearchBar
          placeholder="Search datasets, papers, tools…"
          inputClassName="h-12 rounded-xl text-base shadow-md"
          onSubmit={(query) => {
            if (query.trim()) {
              router.push(`${ROUTES.search}?q=${encodeURIComponent(query.trim())}`);
            }
          }}
          showSuggestions
        />
      </div>
    </section>
  );
}
