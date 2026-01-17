import { getHealthSnapshot } from "@/lib/health";

export type StatusBuildInfo = {
  commit: string;
  environment: string;
};

export type StatusOverview = {
  build: StatusBuildInfo;
  health: ReturnType<typeof getHealthSnapshot>;
  hasHealth: boolean;
};

export function getStatusOverview(): StatusOverview {
  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.COMMIT_SHA ??
    "unknown";
  const environment =
    process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? (process.env.NEXT_PUBLIC_VERCEL_ENV ?? "production");
  const health = getHealthSnapshot();
  const hasHealth =
    Boolean(health.lastSuccessAt) ||
    Boolean(health.lastErrorAt) ||
    Boolean(health.lastCacheStatus);

  return {
    build: { commit, environment },
    health,
    hasHealth,
  };
}
