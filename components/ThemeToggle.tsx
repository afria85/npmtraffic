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

  const label = useMemo(() => (theme === "dark" ? "Dark" : "Light"), [theme]);

  return (
    <button
      type="button"
      className={className}
      title="Toggle theme (defaults to your device setting)"
      onClick={() => {
        const next: Theme = theme === "dark" ? "light" : "dark";
        setTheme(next);
        setHasOverride(true);
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // ignore
        }
      }}
    >
      {label}
    </button>
  );
}
