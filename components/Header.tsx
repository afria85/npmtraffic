import Link from "next/link";
import { hasDonateLinks } from "@/lib/donate";
import ThemeToggle from "@/components/ThemeToggle";

const HEADER_PILL_CLASSES =
  "rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm text-[color:var(--foreground)] transition hover:border-[color:var(--border)]/80 hover:bg-[color:var(--surface)]/80";

export default function Header() {
  const showDonate = hasDonateLinks();
  return (
    <header className="border-b border-[color:var(--border)] bg-[color:var(--surface)]/70 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
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
