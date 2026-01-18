import Link from "next/link";
import { hasDonateLinks } from "@/lib/donate";
import ThemeToggle from "@/components/ThemeToggle";

const HEADER_PILL_CLASSES =
  "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:border-white/20 hover:bg-white/10";

export default function Header() {
  const showDonate = hasDonateLinks();
  return (
    <header className="border-b border-white/10 bg-[color:var(--surface)] px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="text-xs uppercase tracking-[0.3em] text-slate-400">
          npmtraffic
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle className={HEADER_PILL_CLASSES} />
          {showDonate ? (
            <Link href="/donate" className={HEADER_PILL_CLASSES}>
              Donate
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
