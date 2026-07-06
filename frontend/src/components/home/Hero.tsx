'use client';

import { useRouter } from 'next/navigation';
import { SearchBar } from '@/components/search/SearchBar';
import { ROUTES } from '@/lib/constants/routes';

export function Hero() {
  const router = useRouter();

  return (
    <section className="border-b bg-muted/30 py-16 text-center">
      <div className="mx-auto max-w-2xl space-y-6 px-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Bangla AI Hub</h1>
        <p className="text-lg text-muted-foreground">
          Discover Bangla-language datasets, research papers, tools, and tutorials — built by and
          for the Bengali AI community.
        </p>
        <SearchBar
          placeholder="Search datasets, papers, tools…"
          onSubmit={(query) => {
            if (query.trim()) {
              router.push(`${ROUTES.search}?q=${encodeURIComponent(query.trim())}`);
            }
          }}
        />
      </div>
    </section>
  );
}
