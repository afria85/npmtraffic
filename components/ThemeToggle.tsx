"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "npmtraffic_theme";

type Theme = "dark" | "light";

type Persisted = Theme | null;

function readPersistedTheme(): Persisted {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "dark" || saved === "light" ? saved : null;
}

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle({ className }: { className?: string }) {
  // Render deterministically on the first paint to avoid SSR/client mismatches.
  // We sync to persisted/system preferences after mount.
  const [theme, setTheme] = useState<Theme>("dark");
  const [hasOverride, setHasOverride] = useState(false);

  // Sync once after mount (async) to avoid setState directly inside the effect body.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sync = () => {
      const persisted = readPersistedTheme();
      const next = persisted ?? getSystemTheme();
      setHasOverride(persisted !== null);
      setTheme(next);
    };

    const raf = window.requestAnimationFrame(sync);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  // Apply theme to document whenever it changes.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // If there is no user override, keep in sync with the system preference.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasOverride) return;

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;

    const onChange = () => {
      setTheme(getSystemTheme());
    };

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }

    // Safari fallback
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, [hasOverride]);

  const isDark = theme === "dark";
  const toggleClass = `inline-flex items-center justify-center ${className ?? ""}`.trim();

  return (
    <button
      type="button"
      className={toggleClass}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        const next: Theme = isDark ? "light" : "dark";
        setTheme(next);
        setHasOverride(true);
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {}
      }}
    >
      <span className="flex h-5 w-5 items-center justify-center">
        {isDark ? (
          // Sun icon
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          // Moon icon
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
