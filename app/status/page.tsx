import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import BrandText from "@/components/BrandText";
import { getBaseUrl } from "@/lib/base-url";
import { getStatusOverview } from "@/lib/status";

const CACHE_TTL_SUMMARY = "Traffic cache: 15m for short ranges, 12h for long ranges, with up to 24h stale fallback.";

function formatCommit(commit: string) {
  if (!commit || commit === "unknown") return "Not available locally";
  return commit.length > 12 ? commit.slice(0, 12) : commit;
}

function formatUtc(value?: string) {
  if (!value) return null;
  return new Date(value).toUTCString();
}

function StatusPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
      <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--foreground-secondary)]">
        {children}
      </div>
    </section>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const ogImage = `${baseUrl}/og.png`;
  const fallbackOgImage = `${baseUrl}/og-fallback.png`;
  return {
    title: "Status",
    description: "Operational status and recent health for npmtraffic.",
    alternates: {
      canonical: `${baseUrl}/status`,
    },
    openGraph: {
      title: "Status | npmtraffic",
      description: "Operational status and recent health for npmtraffic.",
      url: `${baseUrl}/status`,
      images: [
        { url: ogImage, alt: "npmtraffic status" },
        { url: fallbackOgImage, alt: "npmtraffic" },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Status | npmtraffic",
      description: "Operational status and recent health for npmtraffic.",
      images: [
        { url: ogImage, alt: "npmtraffic status" },
        { url: fallbackOgImage, alt: "npmtraffic" },
      ],
    },
  };
}

export default async function StatusPage() {
  const { build, health, hasHealth } = getStatusOverview();
  const lastSuccess = formatUtc(health.lastSuccessAt);
  const lastError = formatUtc(health.lastErrorAt);

  return (
    <main className="mx-auto min-h-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-6">
        <BrandText />
        <h1 className="mt-2 text-4xl font-semibold">Status</h1>
        <p className="mt-2 text-sm text-[var(--foreground-tertiary)]">Runtime snapshot, upstream health signals, and cache behavior.</p>
        <div className="mt-4 nt-note-warning text-xs">
          <p className="text-[inherit]">
            <strong>Note:</strong> This page reflects recent activity in the current server runtime only. It is not a historical uptime monitor. See{" "}
            <Link href="/transparency" className="-mx-1 px-1 py-2 font-semibold underline underline-offset-2">
              transparency
            </Link>{" "}
            for data and infrastructure details.
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <StatusPanel title="Runtime">
          <p>
            Environment: <span className="font-medium text-[var(--foreground)]">{build.environment}</span>
          </p>
          <p>
            Commit: <code className="break-all">{formatCommit(build.commit)}</code>
          </p>
        </StatusPanel>

        <StatusPanel title="Traffic health">
          {hasHealth ? (
            <>
              <p>Last successful traffic fetch: {lastSuccess ?? "Not recorded in this runtime"}</p>
              <p>
                Last traffic error:{" "}
                {lastError
                  ? `${lastError} (${health.lastErrorCode ?? "unknown"}${health.lastErrorReason ? ` - ${health.lastErrorReason}` : ""})`
                  : "None recorded in this runtime"}
              </p>
            </>
          ) : (
            <p>No traffic health data recorded in this runtime yet.</p>
          )}
        </StatusPanel>

        <StatusPanel title="Cache snapshot">
          {health.lastCacheStatus ? (
            <>
              <p>
                Last traffic cache result:{" "}
                <span className="font-medium text-[var(--foreground)]">{health.lastCacheStatus}</span>
                {health.lastIsStale ? " (served stale)" : ""}
              </p>
              <p>{CACHE_TTL_SUMMARY}</p>
            </>
          ) : (
            <>
              <p>No cache activity recorded in this runtime yet.</p>
              <p>{CACHE_TTL_SUMMARY}</p>
            </>
          )}
        </StatusPanel>

        <StatusPanel title="Data contracts">
          <p>Download counts come from <code>api.npmjs.org</code>.</p>
          <p>Package metadata, search, and release markers come from <code>registry.npmjs.org</code>.</p>
          <p>Successful API responses include request IDs and cache metadata for traceability.</p>
        </StatusPanel>
      </div>
    </main>
  );
}
