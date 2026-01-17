export type HealthSnapshot = {
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastErrorCode?: string;
  lastErrorReason?: string;
  lastCacheStatus?: string;
  lastIsStale?: boolean;
};

const healthState: HealthSnapshot = {};

export function recordSuccess(cacheStatus: string, isStale: boolean) {
  healthState.lastSuccessAt = new Date().toISOString();
  healthState.lastCacheStatus = cacheStatus;
  healthState.lastIsStale = isStale;
}

export function recordError(code: string, reason?: string) {
  healthState.lastErrorAt = new Date().toISOString();
  healthState.lastErrorCode = code;
  if (reason) {
    healthState.lastErrorReason = reason;
  }
}

export function getHealthSnapshot(): HealthSnapshot {
  return { ...healthState };
}

export function resetHealthSnapshot() {
  healthState.lastSuccessAt = undefined;
  healthState.lastErrorAt = undefined;
  healthState.lastErrorCode = undefined;
  healthState.lastErrorReason = undefined;
  healthState.lastCacheStatus = undefined;
  healthState.lastIsStale = undefined;
}
