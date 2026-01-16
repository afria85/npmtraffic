type CacheEntry<T> = { value: T; expiresAt: number; staleAt?: number };

declare global {
  var __npmtraffic_cache__: Map<string, CacheEntry<unknown>> | undefined;
}

const store: Map<string, CacheEntry<unknown>> =
  globalThis.__npmtraffic_cache__ ?? new Map();

globalThis.__npmtraffic_cache__ = store;

export function cacheGet<T>(key: string): { hit: boolean; value?: T } {
  const ent = store.get(key);
  if (!ent) return { hit: false };
  if (Date.now() > ent.expiresAt) {
    store.delete(key);
    return { hit: false };
  }
  return { hit: true, value: ent.value as T };
}

export function cacheSet<T>(key: string, value: T, ttlSeconds: number) {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export function cacheGetWithStale<T>(
  key: string
): { hit: boolean; stale: boolean; value?: T } {
  const ent = store.get(key);
  if (!ent) return { hit: false, stale: false };
  const now = Date.now();
  if (now <= ent.expiresAt) {
    return { hit: true, stale: false, value: ent.value as T };
  }
  if (ent.staleAt && now <= ent.staleAt) {
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
}

export function cacheClear() {
  store.clear();
}
