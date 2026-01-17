import { POPULAR_PACKAGES } from "@/lib/constants";
import { normalizePackageInput } from "@/lib/package-name";
import { fetchTraffic, TrafficError } from "@/lib/traffic";

export type PrewarmFailure = {
  package: string;
  days: number;
  errorCode: string;
};

export type PrewarmResult = {
  warmedCount: number;
  failedCount: number;
  failures: PrewarmFailure[];
  durationMs: number;
};

type PrewarmOptions = {
  packages?: string[];
  days?: number[];
  fetchFn?: (pkg: string, days: number) => Promise<unknown>;
};

const DEFAULT_DAYS = [7, 14, 30];

function normalizePackages(list?: string[]) {
  if (!list || !list.length) {
    return POPULAR_PACKAGES.slice(0, 12);
  }
  return list
    .map((item) => normalizePackageInput(item))
    .filter(Boolean);
}

export async function prewarmTraffic(options: PrewarmOptions = {}): Promise<PrewarmResult> {
  const days = options.days?.filter((value) => [7, 14, 30].includes(value)) ?? DEFAULT_DAYS;
  const pkgs = normalizePackages(options.packages);
  const tasks = pkgs.flatMap((pkg) => days.map((day) => ({ pkg, day })));
  const failures: PrewarmFailure[] = [];
  let warmedCount = 0;
  const start = Date.now();
  const fetchFn = options.fetchFn ?? fetchTraffic;
  const concurrency = 3;

  const timeoutMs = 6000;

  const withTimeout = async <T>(promise: Promise<T>, ms: number) => {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error("timeout")), ms);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async ({ pkg, day }) => {
        try {
          await withTimeout(fetchFn(pkg, day), timeoutMs);
          warmedCount += 1;
        } catch (error: unknown) {
          const failure: PrewarmFailure = {
            package: pkg,
            days: day,
            errorCode:
              error instanceof TrafficError
                ? error.code
                : error instanceof Error
                  ? error.message
                  : "unknown",
          };
          failures.push(failure);
        }
      })
    );
  }

  const durationMs = Date.now() - start;
  return {
    warmedCount,
    failedCount: failures.length,
    failures,
    durationMs,
  };
}
