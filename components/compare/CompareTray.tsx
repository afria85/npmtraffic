"use client";

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
  "inline-flex shrink-0 items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1.5 text-xs text-slate-100 transition hover:bg-[color:var(--surface-3)]";

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
  // Hydration-safe: SSR snapshot is always empty. Client reads localStorage after mount via the store.
  const packages = useSyncExternalStore(subscribeCompareList, loadCompareList, getEmptySnapshot);

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
  const compareUrl = useMemo(() => (ready ? buildCompareUrl(packages, 30) : null), [ready, packages]);
  const label = getCompareButtonLabel(packages.length);
  const selectionLabel = getCompareStatusLabel(packages.length);

  return (
    <div ref={trayRef} className="w-full py-3">
      <div className="w-full sm:mx-auto sm:max-w-3xl sm:px-4" data-testid="compare-tray-container">
        <div className="flex w-full flex-col gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 shadow-sm shadow-black/20 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="text-sm font-semibold text-slate-200">Compare</div>
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
                    {pkg}
                    <span aria-hidden>×</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="min-w-0 flex-1" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-400">{selectionLabel}</span>
            <div className="ml-auto flex items-center gap-2">
              {packages.length ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className={`${ACTION_BUTTON_CLASSES} px-2 sm:px-3 bg-transparent text-[color:var(--muted)] hover:bg-[color:var(--surface-2)]`}
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
