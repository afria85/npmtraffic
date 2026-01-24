"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { buildCompareUrl, loadCompareList, subscribeCompareList } from "@/lib/compare-store";
import { isCompareReady } from "@/lib/compare-ui";

const PILL =
  "inline-flex items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition hover:bg-[color:var(--surface-3)]";

// React requires getServerSnapshot to return a cached value.
const EMPTY_SNAPSHOT: string[] = [];
const getEmptySnapshot = () => EMPTY_SNAPSHOT;

export default function AboutActions() {
  const packages = useSyncExternalStore(subscribeCompareList, loadCompareList, getEmptySnapshot);
  const ready = isCompareReady(packages.length);
  const compareUrl = useMemo(() => (ready ? buildCompareUrl(packages, 30) : null), [ready, packages]);

  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/" className={PILL}>
        Search packages
      </Link>
      {compareUrl ? (
        <Link href={compareUrl} className={PILL}>
          Compare packages
        </Link>
      ) : (
        <button
          type="button"
          className={`${PILL} opacity-50`}
          disabled
          title="Add at least two packages to the compare tray first"
        >
          Compare packages
        </button>
      )}
    </div>
  );
}
