type CacheEntry<T> = { value: T; expiresAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __npmtraffic_cache__: Map<string, CacheEntry<any>> | undefined;
}

const store: Map<string, CacheEntry<any>> =
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