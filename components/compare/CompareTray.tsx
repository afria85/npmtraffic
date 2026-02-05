"use client";

import { useHydrated } from "@/lib/hydrated";
import Link from "next/link";
import { useCallback, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import {
  buildCompareUrl,
  clearCompareList,
  loadCompareList,
  removeFromCompare,
  subscribeCompareList,
} from "@/lib/compare-store";
import { getCompareButtonLabel, getCompareStatusLabel, isCompareReady } from "@/lib/compare-ui";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

// React requires getServerSnapshot to return a cached value.
const EMPTY_SNAPSHOT: string[] = [];
const getEmptySnapshot = () => EMPTY_SNAPSHOT;

const LIST_REMOVAL_CLASS =
  "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-3 pr-2 py-1.5 text-xs text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)]";

type CompareTrayProps = {
  pathname?: string;
  onNavigateToCompareRoot?: () => void;
  onSyncCompareUrl?: (packages: string[], days: number) => void;
  compareDays?: number;
};

export default function CompareTray({
  pathname,
  onNavigateToCompareRoot,
  onSyncCompareUrl,
  compareDays,
}: CompareTrayProps = {}) {
  const hydrated = useHydrated();

  const getClientSnapshot = useCallback(() => {
    return hydrated ? loadCompareList() : EMPTY_SNAPSHOT;
  }, [hydrated]);

  // Hydration-safe: SSR snapshot is always empty. Client reads localStorage after mount.
  const packages = useSyncExternalStore(subscribeCompareList, getClientSnapshot, getEmptySnapshot);

  const trayRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const setSpace = (px: number) => {
      root.style.setProperty("--compare-tray-space", `${px}px`);
    };

    // Default: no reserved space.
    if (!packages.length) {
      setSpace(0);
      return;
    }

    const mql = window.matchMedia("(max-width: 639px)");
    if (!mql.matches) {
      setSpace(0);
      return;
    }

    const el = trayRef.current;
    if (!el) {
      setSpace(0);
      return;
    }

    const update = () => {
      // Reserve space for the tray so fixed/overlay variants do not cover the footer on mobile.
      const height = Math.ceil(el.getBoundingClientRect().height);
      const space = Math.min(220, Math.max(0, height + 16));
      setSpace(space);
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);

    const onResize = () => update();
    window.addEventListener("resize", onResize, { passive: true });
    mql.addEventListener("change", onResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      mql.removeEventListener("change", onResize);
      setSpace(0);
    };
  }, [packages.length]);

  const handleRemove = useCallback(
    (name: string) => {
      const next = packages.filter((pkg) => pkg.toLowerCase() !== name.toLowerCase());
      removeFromCompare(name);

      if (pathname === "/compare" && onSyncCompareUrl) {
        onSyncCompareUrl(next, compareDays ?? 30);
      }
    },
    [packages, pathname, onSyncCompareUrl, compareDays]
  );

  const handleClear = useCallback(() => {
    clearCompareList();
    if (pathname === "/compare" && onSyncCompareUrl) {
      onSyncCompareUrl([], compareDays ?? 30);
    }
    if (pathname === "/compare" && onNavigateToCompareRoot) {
      onNavigateToCompareRoot();
      window.setTimeout(() => clearCompareList(), 0);
    }
  }, [pathname, onNavigateToCompareRoot, onSyncCompareUrl, compareDays]);

  const ready = isCompareReady(packages.length);
  const days = compareDays ?? 30;
  const compareUrl = useMemo(() => (ready ? buildCompareUrl(packages, days) : null), [ready, packages, days]);
  const label = getCompareButtonLabel(packages.length);
  const selectionLabel = getCompareStatusLabel(packages.length);

  return (
    <div ref={trayRef} className="w-full py-3">
      <div className="w-full sm:mx-auto sm:max-w-3xl sm:px-4" data-testid="compare-tray-container">
        <div className="flex w-full flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-sm shadow-black/20 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="text-sm font-semibold text-[var(--foreground-secondary)]">Compare</div>
            {packages.length ? (
              <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto pb-1">
                {packages.map((pkg) => (
                  <button
                    key={pkg}
                    type="button"
                    onClick={() => handleRemove(pkg)}
                    className={LIST_REMOVAL_CLASS}
                    aria-label={`Remove ${pkg} from compare`}
                  >
                    <span className="font-mono">{pkg}</span>
                    <span 
                      className="flex h-4 w-4 items-center justify-center rounded bg-[var(--surface-hover)] text-[var(--foreground-secondary)] transition-colors hover:bg-red-500/20 hover:text-red-400"
                      aria-hidden
                    >
                      ×
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="min-w-0 flex-1" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-[var(--foreground-tertiary)]">{selectionLabel}</span>
            <div className="ml-auto flex items-center gap-2">
              {packages.length ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className={`${ACTION_BUTTON_CLASSES} px-2 sm:px-3 bg-transparent text-[var(--foreground-tertiary)] hover:bg-[var(--surface)]`}
                  aria-label="Clear compare selection"
                >
                  Clear
                </button>
              ) : null}
              {compareUrl ? (
                <Link href={compareUrl} className={ACTION_BUTTON_CLASSES}>
                  {label}
                </Link>
              ) : (
                <button type="button" className={`${ACTION_BUTTON_CLASSES} opacity-50`} aria-disabled disabled>
                  {label}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
