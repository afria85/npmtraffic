"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { buildCompareUrl, loadCompareList, subscribeCompareList } from "@/lib/compare-store";
import { isCompareReady } from "@/lib/compare-ui";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

// React requires getServerSnapshot to return a cached value.
const EMPTY_SNAPSHOT: string[] = [];
const getEmptySnapshot = () => EMPTY_SNAPSHOT;

export default function AboutActions() {
  const packages = useSyncExternalStore(subscribeCompareList, loadCompareList, getEmptySnapshot);
  const ready = isCompareReady(packages.length);
  const compareUrl = useMemo(() => (ready ? buildCompareUrl(packages, 30) : null), [ready, packages]);

  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/" className={`${ACTION_BUTTON_CLASSES} font-semibold`}>
        Search packages
      </Link>
      {compareUrl ? (
        <Link href={compareUrl} className={`${ACTION_BUTTON_CLASSES} font-semibold`}>
          Compare packages
        </Link>
      ) : (
        <button
          type="button"
          className={`${ACTION_BUTTON_CLASSES} font-semibold opacity-50`}
          disabled
          title="Add at least two packages to the compare tray first"
        >
          Compare packages
        </button>
      )}
    </div>
  );
}
