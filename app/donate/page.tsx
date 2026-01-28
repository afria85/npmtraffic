import type { Metadata } from "next";
import { getDonateLinks } from "@/lib/donate";
import { config } from "@/lib/config";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

export const metadata: Metadata = {
  title: "Donate | npmtraffic",
  description: "Support npmtraffic with optional donations that keep the project fast, free, and reliable.",
};

export default function DonatePage() {
  const donateLinks = getDonateLinks();
  
  return (
    <main className="mx-auto min-h-full max-w-3xl px-6 py-16 sm:py-20">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        {/* Header */}
        <header className="mb-8 space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-xs font-medium text-[var(--foreground-secondary)]">
            <svg className="h-4 w-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Support
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
            Support npmtraffic
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg text-[var(--foreground-secondary)]">
            npmtraffic is free to use. Optional donations fund hosting, tooling, and ongoing maintenance to keep the project fast, lightweight, and reliable.
          </p>
        </header>

        {/* Benefits */}
        <section className="mb-12 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-lg">
          <h2 className="mb-6 text-xl font-semibold text-[var(--foreground)]">Your support helps:</h2>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-[var(--foreground)]">Keep caches warm</h3>
                <p className="text-sm text-[var(--foreground-secondary)]">Daily tables and exports stay responsive</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-[var(--foreground)]">Prioritize features</h3>
                <p className="text-sm text-[var(--foreground-secondary)]">Better auditability and attribution tooling</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-[var(--foreground)]">Maintain infrastructure</h3>
                <p className="text-sm text-[var(--foreground-secondary)]">Secure, fast, without ads or paywalls</p>
              </div>
            </div>
          </div>
        </section>

        {/* Donation Links */}
        {donateLinks.length ? (
          <section className="mb-12">
            <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-[var(--foreground-tertiary)]">
              Choose your platform
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {donateLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${ACTION_BUTTON_CLASSES} group w-full justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition-all hover:border-[var(--accent)]/50 hover:bg-[var(--surface-hover)] hover:shadow-md`}
                >
                  <span className="flex items-center gap-3">
                    <span aria-hidden className="text-2xl">{link.icon}</span>
                    <span className="font-medium text-[var(--foreground)]">{link.label}</span>
                  </span>
                  <svg 
                    className="h-5 w-5 text-[var(--foreground-tertiary)] transition-transform group-hover:translate-x-1" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              ))}
            </div>
          </section>
        ) : (
          <div className="mb-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
            <p className="text-sm text-[var(--foreground-secondary)]">
              No donation channels configured yet.
            </p>
          </div>
        )}

        {/* Footer Note */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6 text-center">
          <p className="text-xs text-[var(--foreground-tertiary)]">
            Hosted on {config.site.name} infrastructure. Data sourced from{" "}
            <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[var(--foreground)]">
              api.npmjs.org
            </code>
          </p>
        </div>
      </div>
    </main>
  );
}
