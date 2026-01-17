import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/base-url";
import { getStatusOverview } from "@/lib/status";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  return {
    title: "Status | npmtraffic",
    description: "Operational status and recent health for npmtraffic.",
    alternates: {
      canonical: `${baseUrl}/status`,
    },
  };
}

export default function StatusPage() {
  const { build, health, hasHealth } = getStatusOverview();

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-12">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">npmtraffic</p>
        <h1 className="mt-2 text-4xl font-semibold">Status</h1>
        <p className="text-sm text-slate-400">Latest build, traffic health, and cache snapshot.</p>
      </header>

      <section className="mb-6 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-sm font-semibold text-slate-200">Build + environment</h2>
        <p className="text-sm text-slate-300">
          Commit: <code>{build.commit}</code>
        </p>
        <p className="text-sm text-slate-300">Environment: {build.environment}</p>
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
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

      <section className="mt-6 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
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
    </main>
  );
}
