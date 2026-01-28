"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

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
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  root.classList.toggle("dark", theme === "dark");
}

export default function ThemeToggle() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;

    const onChange = () => {
      const override = readPersistedTheme();
      if (override) {
        applyTheme(override);
        return;
      }
      applyTheme(getSystemTheme());
    };

    onChange();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }

    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="theme-toggle"
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
        <svg className="theme-icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="5" strokeWidth="2" />
          <line x1="12" y1="1" x2="12" y2="3" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="21" x2="12" y2="23" strokeWidth="2" strokeLinecap="round" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" strokeWidth="2" strokeLinecap="round" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" strokeWidth="2" strokeLinecap="round" />
          <line x1="1" y1="12" x2="3" y2="12" strokeWidth="2" strokeLinecap="round" />
          <line x1="21" y1="12" x2="23" y2="12" strokeWidth="2" strokeLinecap="round" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" strokeWidth="2" strokeLinecap="round" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" strokeWidth="2" strokeLinecap="round" />
        </svg>

        <svg className="theme-icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Button>
  );
}
