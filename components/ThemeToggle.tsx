"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "npmtraffic_theme";

type Theme = "dark" | "light";

function readPersistedTheme(): Theme | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "dark" || saved === "light" ? saved : null;
  } catch {
    return null;
  }
}

function getSystemTheme(): Theme {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle({ className }: { className?: string }) {
  // IMPORTANT:
  // Do not read window/localStorage/matchMedia during render.
  // This component is server-rendered as HTML; reading browser-only state in initial render causes hydration mismatch (React #418).
  const [mounted, setMounted] = useState(false);
  const [hasOverride, setHasOverride] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setMounted(true);

    const persisted = readPersistedTheme();
    if (persisted) {
      setHasOverride(true);
      setTheme(persisted);
      applyTheme(persisted);
      return;
    }

    const system = getSystemTheme();
    setHasOverride(false);
    setTheme(system);
    applyTheme(system);
  }, []);

  // Apply theme to document whenever it changes after mount.
  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
  }, [mounted, theme]);

  // If there is no user override, keep in sync with the system preference.
  useEffect(() => {
    if (!mounted) return;
    if (hasOverride) return;

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;

    const onChange = () => {
      const next = getSystemTheme();
      setTheme(next);
      applyTheme(next);
    };

    // Initialize once in case system changed between render and effect.
    onChange();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }

    // Safari fallback
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, [mounted, hasOverride]);

  const isDark = theme === "dark";
  const toggleClass = `inline-flex items-center justify-center ${className ?? ""}`.trim();

  return (
    <button
      type="button"
      className={toggleClass}
      title={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
      aria-label={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
      onClick={() => {
        const next: Theme = isDark ? "light" : "dark";
        setTheme(next);
        setHasOverride(true);
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {}
      }}
    >
      <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
        {mounted && !isDark ? (
          // Moon icon (light mode active)
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          // Sun icon (default / dark mode active)
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
