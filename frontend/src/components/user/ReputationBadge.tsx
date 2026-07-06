import { cn } from '@/lib/utils';

// Mirrors project-planning/14-development-standards.md's Reputation Tiers
// table exactly (score thresholds and labels/colors).
const TIERS = [
  { minScore: 5000, label: 'Legend', className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
  { minScore: 1000, label: 'Champion', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  { minScore: 500, label: 'Expert', className: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
  { minScore: 200, label: 'Trusted', className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' },
  { minScore: 50, label: 'Contributor', className: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  { minScore: 0, label: 'Newcomer', className: 'bg-muted text-muted-foreground' },
] as const;

function resolveTier(score: number) {
  return TIERS.find((tier) => score >= tier.minScore) ?? TIERS[TIERS.length - 1];
}

interface ReputationBadgeProps {
  score: number;
}

export function ReputationBadge({ score }: ReputationBadgeProps) {
  const tier = resolveTier(score);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        tier.className,
      )}
    >
      {tier.label}
    </span>
  );
}
