type CacheEntry<T> = { value: T; expiresAt: number; staleAt?: number };

declare global {
  var __npmtraffic_cache__: Map<string, CacheEntry<unknown>> | undefined;
}

const store: Map<string, CacheEntry<unknown>> =
  globalThis.__npmtraffic_cache__ ?? new Map();

globalThis.__npmtraffic_cache__ = store;

// Prevent unbounded growth in serverless / long-lived Node processes.
// Map preserves insertion order; we refresh access by delete+set.
const MAX_CACHE_ENTRIES = 1000;

// FIX: Periodically purge fully expired entries (past staleAt) to
// prevent the store from filling up with dead entries that only get
// cleaned on individual access. O(n) with n ≤ 1000 — safe to run
// inline during normal cache operations.
const PURGE_INTERVAL_MS = 60_000 * 5; // every 5 minutes
let lastPurge = Date.now();

function purgeExpired() {
  const now = Date.now();
  if (now - lastPurge < PURGE_INTERVAL_MS) return;
  lastPurge = now;

  for (const [key, ent] of store) {
    const deadline = ent.staleAt ?? ent.expiresAt;
    if (now > deadline) {
      store.delete(key);
    }
  }
}

function touch(key: string, ent: CacheEntry<unknown>) {
  // Refresh insertion order to approximate LRU.
  store.delete(key);
  store.set(key, ent);
}

function evictIfNeeded() {
  while (store.size > MAX_CACHE_ENTRIES) {
    const oldestKey = store.keys().next().value as string | undefined;
    if (!oldestKey) return;
    store.delete(oldestKey);
  }
}

export function cacheGet<T>(key: string): { hit: boolean; value?: T } {
  purgeExpired();
  const ent = store.get(key);
  if (!ent) return { hit: false };
  if (Date.now() > ent.expiresAt) {
    store.delete(key);
    return { hit: false };
  }
  touch(key, ent);
  return { hit: true, value: ent.value as T };
}

export function cacheSet<T>(key: string, value: T, ttlSeconds: number) {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  evictIfNeeded();
}

export function cacheGetWithStale<T>(
  key: string
): { hit: boolean; stale: boolean; value?: T } {
  purgeExpired();
  const ent = store.get(key);
  if (!ent) return { hit: false, stale: false };
  const now = Date.now();
  if (now <= ent.expiresAt) {
    touch(key, ent);
    return { hit: true, stale: false, value: ent.value as T };
  }
  if (ent.staleAt && now <= ent.staleAt) {
    touch(key, ent);
    return { hit: true, stale: true, value: ent.value as T };
  }
  store.delete(key);
  return { hit: false, stale: false };
}

export function cacheSetWithStale<T>(
  key: string,
  value: T,
  freshSeconds: number,
  staleSeconds: number
) {
  const now = Date.now();
  store.set(key, {
    value,
    expiresAt: now + freshSeconds * 1000,
    staleAt: now + staleSeconds * 1000,
  });
  evictIfNeeded();
}

export function cacheClear() {
  store.clear();
}
