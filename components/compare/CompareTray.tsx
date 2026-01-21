"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  COMPARE_UPDATED_EVENT,
  buildCompareUrl,
  loadCompareList,
  removeFromCompare,
} from "@/lib/compare-store";
import { getCompareButtonLabel, isCompareReady } from "@/lib/compare-ui";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

const LIST_REMOVAL_CLASS =
  "inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 px-3 py-1.5 text-xs text-slate-100 transition hover:border-white/60";

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-3">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 shadow-sm shadow-black/40 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm font-semibold text-slate-200">Compare</div>
          {packages.length ? (
            <div className="flex flex-wrap items-center gap-2">
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
            <p className="text-xs text-slate-500">Add packages to compare using the button on each package page.</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">
            {ready ? "Open the comparison table" : "Need at least two packages"}
          </span>
          <div className="ml-auto">
            {compareUrl ? (
              <Link href={compareUrl} className={ACTION_BUTTON_CLASSES}>
                {label}
              </Link>
            ) : (
              <button type="button" className={`${ACTION_BUTTON_CLASSES} opacity-50`} disabled>
                {label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
