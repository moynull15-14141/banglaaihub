// Canonical copy of the tier thresholds — mirrors
// frontend/src/components/user/ReputationBadge.tsx exactly (itself sourced
// from project-planning/14-development-standards.md's Reputation Tiers
// table). Single source of truth on the backend so the DTO's
// `contributor_level` field and the level_up notification trigger always
// agree with what the frontend renders.
const TIERS = [
  { minScore: 5000, level: 'Legend' },
  { minScore: 1000, level: 'Champion' },
  { minScore: 500, level: 'Expert' },
  { minScore: 200, level: 'Trusted' },
  { minScore: 50, level: 'Contributor' },
  { minScore: 0, level: 'Newcomer' },
] as const;

export interface ContributorLevelInfo {
  level: string;
  minScore: number;
  nextLevel: string | null;
  nextThreshold: number | null;
}

export function resolveContributorLevel(reputationScore: number): ContributorLevelInfo {
  const index = TIERS.findIndex((tier) => reputationScore >= tier.minScore);
  const tier = TIERS[index] ?? TIERS[TIERS.length - 1];
  const nextTier = index > 0 ? TIERS[index - 1] : null;

  return {
    level: tier.level,
    minScore: tier.minScore,
    nextLevel: nextTier?.level ?? null,
    nextThreshold: nextTier?.minScore ?? null,
  };
}
