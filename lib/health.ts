export type HealthSnapshot = {
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastErrorCode?: string;
  lastCacheStatus?: string;
  lastIsStale?: boolean;
};

const healthState: HealthSnapshot = {};

export function recordCacheResult(cacheStatus: "HIT" | "MISS" | "STALE", fetchedAt?: string) {
  if (fetchedAt) healthState.lastSuccessAt = fetchedAt;
  healthState.lastCacheStatus = cacheStatus;
  healthState.lastIsStale = cacheStatus === "STALE";
}

export function recordError(code: string) {
  healthState.lastErrorAt = new Date().toISOString();
  healthState.lastErrorCode = code;
}

export function getHealthSnapshot(): HealthSnapshot {
  return { ...healthState };
}

export function resetHealthSnapshot() {
  healthState.lastSuccessAt = undefined;
  healthState.lastErrorAt = undefined;
  healthState.lastErrorCode = undefined;
  healthState.lastCacheStatus = undefined;
  healthState.lastIsStale = undefined;
}
