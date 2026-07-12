import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

interface HomeStatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  href: string;
  imageUrl: string | null;
}

// Homepage-specific stat card — separate from the shared StatCard.tsx
// (used on admin dashboard/SEO center/search analytics/profile/dashboard,
// which must keep its plain icon+number look). With no hero image set, this
// still renders that same plain look; an admin-uploaded image adds a cover
// photo with a gradient scrim so the label/count stay legible over any image.
export function HomeStatCard({ icon: Icon, label, value, href, imageUrl }: HomeStatCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex h-28 flex-col justify-end overflow-hidden rounded-xl border bg-muted/40 transition-shadow hover:shadow-md sm:h-32"
    >
      {imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed R2 URL, no fixed domain to allowlist for next/image */}
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
        </>
      ) : null}

      <div
        className={cn(
          'relative flex items-center justify-between gap-2 p-3 sm:p-4',
          imageUrl ? 'text-white' : 'text-foreground',
        )}
      >
        <div className="min-w-0">
          <p className={cn('text-xs font-medium', imageUrl ? 'text-white/80' : 'text-muted-foreground')}>{label}</p>
          <p className="text-lg font-semibold tracking-tight tabular-nums sm:text-2xl">{formatNumber(value)}</p>
        </div>
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg sm:size-10',
            imageUrl ? 'bg-white/15' : 'bg-brand/10 text-brand',
          )}
        >
          <Icon className="size-4 sm:size-5" aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}
