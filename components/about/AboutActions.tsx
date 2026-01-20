"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  COMPARE_UPDATED_EVENT,
  buildCompareUrl,
  loadCompareList,
} from "@/lib/compare-store";
import { isCompareReady } from "@/lib/compare-ui";

const PILL =
  "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/10";

export default function AboutActions() {
  const read = () => (typeof window === "undefined" ? [] : loadCompareList());
  const [packages, setPackages] = useState<string[]>(() => read());

  useEffect(() => {
    const handleUpdate = () => setPackages(read());
    window.addEventListener(COMPARE_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(COMPARE_UPDATED_EVENT, handleUpdate);
  }, []);

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
        <button type="button" className={`${PILL} opacity-50`} disabled title="Add at least two packages to the compare tray first">
          Compare packages
        </button>
      )}
    </div>
  );
}
