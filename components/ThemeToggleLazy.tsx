"use client";

import dynamic from "next/dynamic";

export type ThemeToggleLazyProps = {
  className?: string;
};

/**
 * Client-only wrapper to keep theme logic out of the SSR HTML while still
 * allowing the header to render deterministically.
 *
 * Note: We intentionally use `ssr: false` to avoid hydration mismatches caused
 * by extensions injecting attributes into <body> before React loads.
 */
const ThemeToggleClient = dynamic(() => import("./ThemeToggle"), {
  ssr: false,
  loading: () => (
    <button
      type="button"
      aria-label="Theme"
      className="inline-flex items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-2 text-sm text-[color:var(--foreground)]"
      disabled
    >
      Theme
    </button>
  ),
});

export default function ThemeToggleLazy({ className }: ThemeToggleLazyProps) {
  return <ThemeToggleClient className={className} />;
}
