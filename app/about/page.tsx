import type { Metadata } from "next";
import AboutActions from "@/components/about/AboutActions";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why npmtraffic exists: daily npm download tables, compare insights, release context, local event markers, and deterministic exports.",
};

export default function AboutPage() {
  return (
    <main className="relative min-h-screen px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl space-y-16">
        {/* Header */}
        <header className="space-y-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
            Built for maintainers who need answers
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-[var(--foreground-secondary)]">
            npm download counts are useful, but charts alone rarely answer the questions that matter: when did something change, how big was the shift, and what context explains it?
          </p>
        </header>

        {/* What You Get */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-lg sm:p-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
              <svg className="h-5 w-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[var(--foreground)]">What you get</h2>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Daily breakdown table", "Read UTC daily rows, deltas, MA3/MA7, and outlier scores date-by-date."],
              ["Package insights", "Scan latest trend, peak day, active rate, consistency, and strongest outlier."],
              ["Compare packages", "Compare 2-5 packages with aligned ranges, share, leader, fastest mover, and closest race."],
              ["Release context", "Show npm publish markers, version metadata, dist-tag latest, and releases in range."],
              ["Local event markers", "Add incidents, posts, or releases; import/export JSON; share events only when you choose."],
              ["Deterministic exports", "CSV, Excel CSV, JSON, chart SVG, and chart PNG exports with traceable metadata where relevant."],
            ].map(([title, description]) => (
              <div key={title} className="flex min-w-0 items-start gap-3">
                <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--accent)]" />
                <div className="min-w-0">
                  <h3 className="font-medium text-[var(--foreground)]">{title}</h3>
                  <p className="text-sm text-[var(--foreground-secondary)]">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Design Principles */}
        <section className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="mb-2 font-semibold text-[var(--foreground)]">Local-first events</h3>
            <p className="text-sm text-[var(--foreground-secondary)]">
              Event annotations live in your browser storage by default.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h3 className="mb-2 font-semibold text-[var(--foreground)]">Shareable analysis</h3>
            <p className="text-sm text-[var(--foreground-secondary)]">
              Compare links are explicit and compact; event sharing is opt-in.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="mb-2 font-semibold text-[var(--foreground)]">Operational restraint</h3>
            <p className="text-sm text-[var(--foreground-secondary)]">
              No accounts, no heavy dashboard shell, no unrelated tracking surface.
            </p>
          </div>
        </section>

        {/* Technical Details */}
        <section className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="font-semibold text-[var(--foreground)]">Time zone</h3>
            <p className="text-sm text-[var(--foreground-secondary)]">
              All daily rows are normalized and displayed in{" "}
              <span className="font-mono text-[var(--accent)]">UTC</span> to match npm&rsquo;s official reporting window.
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="font-semibold text-[var(--foreground)]">Privacy</h3>
            <p className="text-sm text-[var(--foreground-secondary)]">
              Privacy-preserving analytics (Vercel Web Analytics) for aggregate usage. No ad pixels. Theme preference uses a first-party cookie plus localStorage. No user profiles. No cross-site tracking.
            </p>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6">
          <p className="text-sm text-[var(--foreground-tertiary)]">
            <strong className="font-medium text-[var(--foreground)]">Disclaimer:</strong> npmtraffic is not affiliated with npm, Inc. Download numbers come from{" "}
            <code className="rounded bg-[var(--surface)] px-2 py-1 font-mono text-xs text-[var(--foreground)]">
              api.npmjs.org
            </code>{" "}
            and represent total downloads, not unique users.
          </p>
        </section>

        {/* Actions */}
        <AboutActions />
      </div>
    </main>
  );
}
