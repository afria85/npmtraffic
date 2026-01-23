"use client";

import { useEffect } from "react";

const STORAGE_KEY = "npmtraffic_theme";

type Theme = "dark" | "light";

function readPersistedTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "dark" || saved === "light" ? saved : null;
}

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getActiveTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  const current = document.documentElement.dataset.theme;
  return current === "light" ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

/**
 * ThemeToggle is intentionally "render-deterministic": it does not read window/localStorage during render.
 * This prevents hydration mismatches (React error #418 in minified production builds).
 *
 * The visible icon is controlled via CSS based on :root[data-theme].
 */
export default function ThemeToggle({ className }: { className?: string }) {
  useEffect(() => {
    // Keep theme in sync with system preference only when there is no user override.
    if (typeof window === "undefined") return;

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;

    const onChange = () => {
      const override = readPersistedTheme();
      if (override) return;
      applyTheme(getSystemTheme());
    };

    // Ensure theme is correct if the system preference changed before this effect ran.
    onChange();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }

    // Safari fallback
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  const toggleClass = `theme-toggle inline-flex items-center justify-center ${className ?? ""}`.trim();

  return (
    <button
      type="button"
      className={toggleClass}
      title="Toggle theme"
      aria-label="Toggle theme"
      onClick={() => {
        const current = getActiveTheme();
        const next: Theme = current === "dark" ? "light" : "dark";
        applyTheme(next);
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // ignore
        }
      }}
    >
      <span className="flex h-5 w-5 items-center justify-center">
        {/* Sun icon (shown in dark mode to indicate switching to light) */}
        <svg className="theme-icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        {/* Moon icon (shown in light mode to indicate switching to dark) */}
        <svg className="theme-icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
