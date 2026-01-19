import type { Metadata } from "next";
import Link from "next/link";
import { getDonateLinks } from "@/lib/donate";
import { config } from "@/lib/config";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

export const metadata: Metadata = {
  title: "Donate | npmtraffic",
  description: "Support npmtraffic with optional donations that keep the project running low-cost and free.",
};

export default function DonatePage() {
  const donateLinks = getDonateLinks();
  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 px-4 py-12">
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">npmtraffic</p>
        <h1 className="text-3xl font-semibold tracking-tight">Support npmtraffic</h1>
        <p className="text-sm text-slate-300">
          npmtraffic is free to use. Optional donations help cover hosting, tooling, and ongoing
          maintenance so the project can stay fast, low-cost, and reliable. If funding ever meaningfully
          exceeds basic maintenance needs, it will go toward roadmap items that improve trust and analysis
          depth (for example: better attribution tooling, long-term history, and safer exports).
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
                className={`${ACTION_BUTTON_CLASSES} w-full justify-between rounded-xl`}
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
