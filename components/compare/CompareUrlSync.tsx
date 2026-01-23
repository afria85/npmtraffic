"use client";

import { useEffect } from "react";
import {
  COMPARE_UPDATED_EVENT,
  loadCompareList,
  saveCompareList,
} from "@/lib/compare-store";

function canonicalize(list: string[]) {
  // ringan: unique + sort (sesuai kebiasaan compare-store)
  const uniq = Array.from(new Set(list.map((s) => s.trim()).filter(Boolean)));
  // jangan sort kalau kamu ingin preserve urutan URL; kalau ingin konsisten, sort:
  return uniq;
}

export default function CompareUrlSync({ packages }: { packages: string[] }) {
  useEffect(() => {
    // Ini "sync external system" (localStorage), bukan setState.
    const canonical = canonicalize(packages);
    if (canonical.length < 2) return;

    const current = canonicalize(loadCompareList());
    const same =
      current.length === canonical.length && current.every((v, i) => v === canonical[i]);

    if (same) return;

    saveCompareList(canonical);
    window.dispatchEvent(new CustomEvent(COMPARE_UPDATED_EVENT));
  }, [packages]);

  return null;
}
