"use client";

import { useEffect } from "react";
import { COMPARE_UPDATED_EVENT, loadCompareList, saveCompareList } from "@/lib/compare-store";

function canonicalize(list: string[]) {
  // Normalize and de-duplicate while preserving order. This keeps the URL-driven
  // compare list stable without forcing an arbitrary sort.
  const uniq = Array.from(new Set(list.map((s) => s.trim()).filter(Boolean)));
  return uniq;
}

export default function CompareUrlSync({ packages }: { packages: string[] }) {
  useEffect(() => {
    // Sync an external system (localStorage) from URL state. No React state updates here.
    const canonical = canonicalize(packages);
    if (canonical.length < 2) return;

    const current = canonicalize(loadCompareList());
    const same = current.length === canonical.length && current.every((v, i) => v === canonical[i]);
    if (same) return;

    saveCompareList(canonical);
    window.dispatchEvent(new CustomEvent(COMPARE_UPDATED_EVENT));
  }, [packages]);

  return null;
}
