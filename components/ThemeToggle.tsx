"use client";

import { useEffect, useMemo, useState } from "react";

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
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <path
        d="M12 18a6 6 0 1 0 0-12a6 6 0 0 0 0 12Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 2v2.5M12 19.5V22M4.22 4.22l1.77 1.77M18.01 18.01l1.77 1.77M2 12h2.5M19.5 12H22M4.22 19.78l1.77-1.77M18.01 5.99l1.77-1.77"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <path
        d="M21 14.5A7.5 7.5 0 0 1 9.5 3a6.5 6.5 0 1 0 11.5 11.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ThemeToggle({ className }: { className?: string }) {
  // Initialize from persisted override if available; otherwise mirror system.
  const [hasOverride, setHasOverride] = useState<boolean>(() => readPersistedTheme() !== null);
  const [theme, setTheme] = useState<Theme>(() => readPersistedTheme() ?? getSystemTheme());

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

    // Initialize once in case system changed between render and effect.
    onChange();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }

    // Safari fallback
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, [hasOverride]);

  const nextTheme = useMemo<Theme>(() => (theme === "dark" ? "light" : "dark"), [theme]);
  const ariaLabel = useMemo(
    () => `Switch to ${nextTheme === "dark" ? "dark" : "light"} theme`,
    [nextTheme]
  );

  return (
    <button
      type="button"
      className={className}
      title="Toggle theme (defaults to your device setting)"
      aria-label={ariaLabel}
      onClick={() => {
        const next: Theme = nextTheme;
        setTheme(next);
        setHasOverride(true);
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // ignore
        }
      }}
    >
      <span className="sr-only">{ariaLabel}</span>
      {theme === "dark" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
