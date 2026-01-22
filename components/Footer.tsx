"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getProjectGithubUrl } from "@/lib/donate";

export default function Footer() {
  const projectGithubUrl = getProjectGithubUrl();
  const pathname = usePathname();
  const isDonateRoute = pathname === "/donate" || pathname === "/support";
  return (
    <footer className="border-t border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-6 text-sm text-[color:var(--foreground)]/80">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[color:var(--muted)]">
          <Link href="/" className="hover:text-[color:var(--foreground)]">Home</Link>
          <Link href="/about" className="hover:text-[color:var(--foreground)]">
            About
          </Link>
          <Link href="/roadmap" className="hover:text-[color:var(--foreground)]">
            Roadmap
          </Link>
          <Link href="/transparency" className="hover:text-[color:var(--foreground)]">
            Transparency
          </Link>
          <Link href="/status" className="hover:text-[color:var(--foreground)]">
            Status
          </Link>
          <Link href="/donate" className="hover:text-[color:var(--foreground)]">
            Support
          </Link>
          {projectGithubUrl ? (
            <a
              href={projectGithubUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[color:var(--foreground)]"
            >
              GitHub
            </a>
          ) : null}
        </nav>
        <p className="text-xs text-[color:var(--muted)]">
          Optional support helps cover hosting and maintenance.
          {!isDonateRoute ? (
            <>
              {" "}
              Support is always available on the{" "}
              <Link
                href="/donate"
                className="underline decoration-white/20 underline-offset-4 hover:text-[color:var(--foreground)]"
              >
                donate
              </Link>{" "}
              page.
            </>
          ) : null}
        </p>
        <p className="text-xs text-[color:var(--muted)]">
          npmtraffic is not affiliated with npm, Inc. Data from api.npmjs.org.
        </p>
      </div>
    </footer>
  );
}
