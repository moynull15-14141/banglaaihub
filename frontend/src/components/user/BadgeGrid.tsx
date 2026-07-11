import {
  Award,
  BadgeCheck,
  Crown,
  Layers,
  MessageCircle,
  Rocket,
  Star,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Badge as BadgeType } from '@/types/badge';

// Fixed mapping (not dynamic require-by-string) — the badge catalog is
// small and admin-managed, and this avoids pulling in lucide's full dynamic
// icon resolver just for ~10 possible icons.
const ICONS: Record<string, LucideIcon> = {
  BadgeCheck,
  Rocket,
  Layers,
  Star,
  MessageCircle,
  TrendingUp,
  Crown,
};

interface BadgeGridProps {
  badges: BadgeType[];
  className?: string;
}

export function BadgeGrid({ badges, className }: BadgeGridProps) {
  if (badges.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {badges.map((badge) => {
        const Icon = ICONS[badge.icon] ?? Award;
        return (
          <div
            key={badge.id}
            title={badge.description}
            className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium"
          >
            <Icon className="size-3.5 text-brand" aria-hidden="true" />
            {badge.name}
          </div>
        );
      })}
    </div>
  );
}
