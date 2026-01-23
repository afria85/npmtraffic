"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  COMPARE_UPDATED_EVENT,
  buildCompareUrl,
  loadCompareList,
} from "@/lib/compare-store";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

function formatComparePreview(list: string[]) {
  if (!list.length) return "";
  const firstTwo = list.slice(0, 2);
  if (list.length <= 2) return firstTwo.join(", ");
  return `${firstTwo.join(", ")}, +${list.length - 2}`;
}

export default function CompareLink() {
  const [list, setList] = useState<string[]>(() => loadCompareList());

  useEffect(() => {
    const handleUpdate = () => setList(loadCompareList());
    window.addEventListener(COMPARE_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(COMPARE_UPDATED_EVENT, handleUpdate);
  }, []);

  const url = buildCompareUrl(list, 30);
  const preview = useMemo(() => formatComparePreview(list), [list]);
  if (!url) return null;

  return (
    <Link
      href={url}
      className={ACTION_BUTTON_CLASSES + " group relative"}
      title={preview ? `Compare: ${preview}` : "Compare"}
      aria-label={preview ? `Compare selected packages: ${preview}` : "Compare selected packages"}
    >
      Compare ({list.length})
      {preview ? (
        <span
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-max max-w-[min(88vw,520px)] -translate-x-1/2 rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-[11px] text-slate-200 shadow-lg backdrop-blur opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
          role="tooltip"
        >
          {preview}
        </span>
      ) : null}
    </Link>
  );
}
