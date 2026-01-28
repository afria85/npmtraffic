"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { usePathname } from "next/navigation";
import { getProjectGithubUrl } from "@/lib/donate";

export default function Footer() {
  const projectGithubUrl = getProjectGithubUrl();
  const pathname = usePathname();
  const isDonateRoute = pathname === "/donate" || pathname === "/support";
  
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Logo size="sm" />
            </div>
            <p className="text-sm text-[var(--foreground-secondary)]">
              Daily npm download analytics built for package maintainers.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground-tertiary)]">
              Product
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/" className="text-[var(--foreground-secondary)] transition-colors hover:text-[var(--accent)]">
                Home
              </Link>
              <Link href="/compare" className="text-[var(--foreground-secondary)] transition-colors hover:text-[var(--accent)]">
                Compare
              </Link>
              <Link href="/about" className="text-[var(--foreground-secondary)] transition-colors hover:text-[var(--accent)]">
                About
              </Link>
              <Link href="/roadmap" className="text-[var(--foreground-secondary)] transition-colors hover:text-[var(--accent)]">
                Roadmap
              </Link>
            </nav>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground-tertiary)]">
              Resources
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/transparency" className="text-[var(--foreground-secondary)] transition-colors hover:text-[var(--accent)]">
                Transparency
              </Link>
              <Link href="/status" className="text-[var(--foreground-secondary)] transition-colors hover:text-[var(--accent)]">
                Status
              </Link>
              {projectGithubUrl && (
                <a
                  href={projectGithubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--foreground-secondary)] transition-colors hover:text-[var(--accent)]"
                >
                  GitHub
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </nav>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground-tertiary)]">
              Support
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/donate" className="text-[var(--foreground-secondary)] transition-colors hover:text-[var(--accent)]">
                Donate
              </Link>
            </nav>
            {!isDonateRoute && (
              <p className="text-xs text-[var(--foreground-tertiary)]">
                Optional donations help cover hosting and maintenance.
              </p>
            )}
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col gap-4 border-t border-[var(--border)] pt-8 text-xs text-[var(--foreground-tertiary)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            npmtraffic is not affiliated with npm, Inc. Data from{" "}
            <code className="rounded bg-[var(--surface-elevated)] px-1 py-0.5 font-mono">
              api.npmjs.org
            </code>
          </p>
          <p>&copy; {new Date().getFullYear()} npmtraffic. Apache 2.0 License.</p>
        </div>
      </div>
    </footer>
  );
}
