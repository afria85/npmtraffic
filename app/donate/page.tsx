import type { Metadata } from "next";
import Link from "next/link";
import { donateLinks } from "@/lib/donate";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Donate | npmtraffic",
  description: "Support npmtraffic with optional donations that keep the project running low-cost and free.",
};

export default function DonatePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-12">
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">npmtraffic</p>
        <h1 className="text-3xl font-semibold tracking-tight">Support this project</h1>
        <p className="text-sm text-slate-300">
          npmtraffic is free to use, and donations help cover hosting, tooling, and passing time
          maintaining the product. There are no paywalls or hidden tiers—donations are purely
          voluntary.
        </p>
      </section>
      {donateLinks.length ? (
        <section>
          <div className="grid gap-3 sm:grid-cols-2">
            {donateLinks.map((link) => (
              <Link
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/10"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden>{link.icon}</span>
                  <span>{link.label}</span>
                </span>
                <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Open</span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          No donation channels configured yet.
        </p>
      )}
      <p className="text-xs text-slate-500">
        Hosted on {config.site.name} infrastructure. Data sourced from api.npmjs.org.
      </p>
    </main>
  );
}
