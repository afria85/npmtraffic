import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";

const HEADER_PILL_CLASSES =
  "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:border-white/20 hover:bg-white/10";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[color:var(--surface)] px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
          <Image
            src="/brand-mark.png"
            alt="npmtraffic"
            width={20}
            height={20}
            priority
            className="h-5 w-5"
          />
          <span>npmtraffic</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/" aria-label="Home" className={`${HEADER_PILL_CLASSES} sm:hidden`} title="Home">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M9.293 2.5a1 1 0 0 1 1.414 0l7.25 7.25a1 1 0 1 1-1.414 1.414L16 10.571V16a2 2 0 0 1-2 2h-3v-4H9v4H6a2 2 0 0 1-2-2v-5.429l-.543.543a1 1 0 0 1-1.414-1.414l7.25-7.25z" />
            </svg>
          </Link>
          <Link href="/about" className={HEADER_PILL_CLASSES}>
            About
          </Link>
          <ThemeToggle className={HEADER_PILL_CLASSES} />
        </div>
      </div>
    </header>
  );
}
