"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  COMPARE_UPDATED_EVENT,
  buildCompareUrl,
  loadCompareList,
  removeFromCompare,
} from "@/lib/compare-store";
import { getCompareButtonLabel, getCompareStatusLabel, isCompareReady } from "@/lib/compare-ui";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

const LIST_REMOVAL_CLASS =
  "inline-flex shrink-0 items-center gap-2 rounded-full border border-white/30 bg-white/5 px-3 py-1.5 text-xs text-slate-100 transition hover:border-white/60";

export default function CompareTray() {
  const [packages, setPackages] = useState<string[]>(() => loadCompareList());

  useEffect(() => {
    const handleUpdate = () => setPackages(loadCompareList());
    window.addEventListener(COMPARE_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(COMPARE_UPDATED_EVENT, handleUpdate);
  }, []);

  const handleRemove = useCallback((name: string) => {
    setPackages(removeFromCompare(name));
  }, []);

  const ready = isCompareReady(packages.length);
  const compareUrl = ready ? buildCompareUrl(packages, 30) : null;
  const label = getCompareButtonLabel(packages.length);
  const selectionLabel = getCompareStatusLabel(packages.length);

  return (
    <div className="w-full py-3">
      <div
        className="w-full sm:mx-auto sm:max-w-3xl sm:px-4"
        data-testid="compare-tray-container"
      >
        <div className="flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 shadow-sm shadow-black/40 backdrop-blur">
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
                    <span aria-hidden>x</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="min-w-0 flex-1" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-400">{selectionLabel}</span>
            <div className="ml-auto">
              {compareUrl ? (
                <Link href={compareUrl} className={ACTION_BUTTON_CLASSES}>
                  {label}
                </Link>
              ) : (
                <button
                  type="button"
                  className={`${ACTION_BUTTON_CLASSES} opacity-50`}
                  aria-disabled
                  disabled
                >
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
