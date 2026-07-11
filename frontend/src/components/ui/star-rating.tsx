'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZE_CLASSES = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
} as const;

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

// Composable primitive: display-only when `onChange` is omitted (ResourceMeta/
// ResourceCard/RatingSummary), interactive input when provided (ReviewForm).
export function StarRating({ value, onChange, size = 'md', className }: StarRatingProps) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);
  const interactive = Boolean(onChange);
  const displayValue = hoverValue ?? value;

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={interactive ? 'Rating' : `Rated ${value} out of 5 stars`}
      onMouseLeave={interactive ? () => setHoverValue(null) : undefined}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(displayValue);
        const Comp = interactive ? 'button' : 'span';
        return (
          <Comp
            key={star}
            type={interactive ? 'button' : undefined}
            aria-label={interactive ? `${star} star${star > 1 ? 's' : ''}` : undefined}
            className={interactive ? 'cursor-pointer' : undefined}
            onMouseEnter={interactive ? () => setHoverValue(star) : undefined}
            onClick={interactive ? () => onChange?.(star) : undefined}
          >
            <Star
              className={cn(
                SIZE_CLASSES[size],
                filled ? 'fill-amber-400 text-amber-400' : 'fill-none text-muted-foreground',
              )}
            />
          </Comp>
        );
      })}
    </div>
  );
}
