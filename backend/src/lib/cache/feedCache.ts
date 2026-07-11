interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface FeedCache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs: number): void;
  invalidate(key: string): void;
  invalidatePrefix(prefix: string): void;
}

// No Redis in this stack yet — this in-process Map is deliberately built
// behind the FeedCache interface so a later Redis-backed implementation is a
// single-file swap (see project-planning's Phase 4D plan §3). Map insertion
// order gives cheap LRU eviction: re-inserting a key on read moves it to the
// end, and eviction always removes the first (oldest-touched) entry.
const MAX_ENTRIES = 5000;

class InMemoryFeedCache implements FeedCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    if (!this.store.has(key) && this.store.size >= MAX_ENTRIES) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

export const feedCache: FeedCache = new InMemoryFeedCache();
