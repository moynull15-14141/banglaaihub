export interface DiversityCard {
  resourceId: string;
  authorId: string | null;
  categoryId: number | null;
  resourceType: string;
  affinityScore: number;
  seenPenalty: number;
  score: number;
}

export interface DiversityCaps {
  maxPerContributor: number;
  maxPerCategory: number;
  maxPerType: number;
}

// Greedy re-rank over an already score-sorted list: walk it maintaining
// running per-page-sized-window counts of {contributor, category, type},
// deferring (not dropping) any candidate that would exceed a cap unless the
// current window would otherwise finish under-filled. O(n^2) worst case,
// fine at this platform's candidate-set scale (a few hundred), consistent
// with the rest of this codebase's JS-only scoring (see resolveTrendingPage).
export function applyDiversityPass<T extends DiversityCard>(cards: T[], pageSize: number, caps: DiversityCaps): T[] {
  const pool = cards.slice();
  const output: T[] = [];
  let windowCount = 0;
  let byContributor = new Map<string, number>();
  let byCategory = new Map<string, number>();
  let byType = new Map<string, number>();

  const fitsWindow = (card: T): boolean =>
    (byContributor.get(card.authorId ?? '') ?? 0) < caps.maxPerContributor &&
    (byCategory.get(String(card.categoryId ?? '')) ?? 0) < caps.maxPerCategory &&
    (byType.get(card.resourceType) ?? 0) < caps.maxPerType;

  while (pool.length > 0) {
    let index = pool.findIndex(fitsWindow);

    if (index === -1) {
      if (windowCount < pageSize) {
        // Nothing left fits the caps but the page isn't full yet — take the
        // best remaining candidate anyway rather than under-filling.
        index = 0;
      } else {
        byContributor = new Map();
        byCategory = new Map();
        byType = new Map();
        windowCount = 0;
        continue;
      }
    }

    const [picked] = pool.splice(index, 1);
    output.push(picked);
    byContributor.set(picked.authorId ?? '', (byContributor.get(picked.authorId ?? '') ?? 0) + 1);
    byCategory.set(String(picked.categoryId ?? ''), (byCategory.get(String(picked.categoryId ?? '')) ?? 0) + 1);
    byType.set(picked.resourceType, (byType.get(picked.resourceType) ?? 0) + 1);
    windowCount += 1;

    if (windowCount >= pageSize) {
      byContributor = new Map();
      byCategory = new Map();
      byType = new Map();
      windowCount = 0;
    }
  }

  return output;
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

// Deterministic per (user, mode, day) — same seed produces the same
// injection points within a caching window, so infinite scroll doesn't
// reshuffle discovery picks between page fetches, but a new day reshuffles.
function mulberry32(seed: number): () => number {
  let a = seed;
  return function random(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Surfaces genuinely different content the ranking would otherwise bury —
// every 10-15 cards (configurable), pull forward a candidate with ~zero
// affinity and no seen-penalty from later in the list. Never drops a card,
// only reorders, so nothing the ranking already selected disappears.
export function injectDiscovery<T extends DiversityCard>(
  cards: T[],
  seed: string,
  minInterval: number,
  maxInterval: number,
): T[] {
  if (cards.length <= minInterval) return cards;

  const discoveryPool = cards.filter((c) => c.affinityScore <= 0 && c.seenPenalty <= 0);
  if (discoveryPool.length === 0) return cards;

  const rng = mulberry32(hashSeed(seed));
  const output = cards.slice();
  const used = new Set<string>();
  const nextGap = (): number => minInterval + Math.floor(rng() * (maxInterval - minInterval + 1));

  let cursor = nextGap();
  while (cursor < output.length) {
    const candidate = discoveryPool.find((c) => !used.has(c.resourceId));
    if (!candidate) break;
    used.add(candidate.resourceId);

    const currentIndex = output.findIndex((c) => c.resourceId === candidate.resourceId);
    // Only worth moving if it isn't already this near the top of the feed.
    if (currentIndex > cursor) {
      const [item] = output.splice(currentIndex, 1);
      output.splice(cursor, 0, item);
    }

    cursor += nextGap();
  }

  return output;
}
