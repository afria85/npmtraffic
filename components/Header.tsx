import Link from "next/link";
import Image from "next/image";
import ThemeToggleLazy from "@/components/ThemeToggleLazy";
import CompareLink from "@/components/compare/CompareLink";


const HEADER_PILL_CLASSES =
  "rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-2 text-sm text-[color:var(--foreground)] transition hover:bg-[color:var(--surface-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";
const REPO_URL = "https://github.com/afria85/npmtraffic";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          <Image
            src="/brand-mark.png"
            alt=""
            aria-hidden="true"
            width={20}
            height={20}
            priority
            className="h-5 w-5"
          />
          <span>npmtraffic</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/about" className={HEADER_PILL_CLASSES}>
            About
          </Link>
          <CompareLink className={HEADER_PILL_CLASSES} />
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className={HEADER_PILL_CLASSES}
            aria-label="GitHub repository"
            title="GitHub repository"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-4 w-4"
              fill="currentColor"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          </a>
          <ThemeToggleLazy className={HEADER_PILL_CLASSES} />
        </div>
      </div>
    </header>
  );
}