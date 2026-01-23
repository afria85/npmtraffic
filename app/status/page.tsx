import type { Metadata } from "next";
import { getBaseUrl, resolveBaseUrl } from "@/lib/base-url";
import { getStatusOverview } from "@/lib/status";

const CACHE_TTL_SUMMARY = "Cache TTL: <=30d ranges refresh every 15m; longer windows refresh every 12h with stale-while-revalidate.";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const ogImage = `${baseUrl}/og.png`;
  return {
    title: "Status | npmtraffic",
    description: "Operational status and recent health for npmtraffic.",
    alternates: {
      canonical: `${baseUrl}/status`,
    },
    openGraph: {
      title: "Status | npmtraffic",
      description: "Operational status and recent health for npmtraffic.",
      url: `${baseUrl}/status`,
      images: [{ url: ogImage, alt: "npmtraffic status" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Status | npmtraffic",
      description: "Operational status and recent health for npmtraffic.",
    },
  };
}

export default async function StatusPage() {
  let baseUrl: string;
  try {
    baseUrl = await getBaseUrl();
  } catch {
    baseUrl = resolveBaseUrl();
  }
  const { build, health, hasHealth } = getStatusOverview();

  return (
    <main className="mx-auto min-h-full max-w-4xl px-4 py-12">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">npmtraffic</p>
        <h1 className="mt-2 text-4xl font-semibold">Status</h1>
        <p className="text-sm text-slate-400">Latest build, traffic health, and cache snapshot.</p>
      </header>

      <section className="mb-6 space-y-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
        <h2 className="text-sm font-semibold text-slate-200">Build + environment</h2>
        <p className="text-sm text-slate-300">
          Commit: <code>{build.commit}</code>
        </p>
        <p className="text-sm text-slate-300">Environment: {build.environment}</p>
      </section>

      <section className="space-y-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
        <h2 className="text-sm font-semibold text-slate-200">Provider health</h2>
        {hasHealth ? (
          <div className="space-y-2 text-sm text-slate-300">
            {health.lastSuccessAt ? (
              <p>Last traffic success: {new Date(health.lastSuccessAt).toUTCString()}</p>
            ) : null}
            {health.lastErrorAt ? (
              <p>
                Last traffic error: {new Date(health.lastErrorAt).toUTCString()} (
                {health.lastErrorCode ?? "unknown"} {health.lastErrorReason ? `– ${health.lastErrorReason}` : ""})
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No health data recorded yet.</p>
        )}
      </section>

      <section className="mt-6 space-y-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
        <h2 className="text-sm font-semibold text-slate-200">Cache snapshot</h2>
        {hasHealth ? (
          <div className="space-y-2 text-sm text-slate-300">
            {health.lastCacheStatus ? (
              <p>
                Last cache status: {health.lastCacheStatus}
                {health.lastIsStale ? " (stale)" : ""}
              </p>
            ) : (
              <p>No cache activity yet.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No cache data recorded yet.</p>
        )}
      </section>

      <section className="mt-6 space-y-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
        <h2 className="text-sm font-semibold text-slate-200">Diagnostics</h2>
        <p className="text-sm text-slate-300">
          Resolved base URL: <code>{baseUrl}</code>
        </p>
        <p className="text-sm text-slate-300">{CACHE_TTL_SUMMARY}</p>
      </section>
    </main>
  );
}
