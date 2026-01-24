"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import {
  buildCompareUrl,
  loadCompareList,
  subscribeCompareList,
} from "@/lib/compare-store";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

function formatComparePreview(list: string[]) {
  if (!list.length) return "";
  const firstTwo = list.slice(0, 2);
  if (list.length <= 2) return firstTwo.join(", ");
  return `${firstTwo.join(", ")}, +${list.length - 2}`;
}

export default function CompareLink({
  days = 30,
  className,
}: {
  days?: number;
  className?: string;
} = {}) {
  const list = useSyncExternalStore(subscribeCompareList, loadCompareList, () => []);

  const url = useMemo(() => buildCompareUrl(list, days), [list, days]);
  const preview = useMemo(() => formatComparePreview(list), [list]);
  if (!url) return null;

  return (
    <Link
      href={url}
      className={(className ?? ACTION_BUTTON_CLASSES) + " group relative"}
      title={preview ? `Compare: ${preview}` : "Compare"}
      aria-label={preview ? `Compare selected packages: ${preview}` : "Compare selected packages"}
    >
      Compare ({list.length})
      {preview ? (
        <span
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-max max-w-[min(88vw,520px)] -translate-x-1/2 rounded-xl border border-[color:var(--chart-tooltip-border)] bg-[color:var(--chart-tooltip-bg)] px-3 py-2 text-[11px] text-[color:var(--foreground)] shadow-lg backdrop-blur opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
          role="tooltip"
        >
          {preview}
        </span>
      ) : null}
    </Link>
  );
}
