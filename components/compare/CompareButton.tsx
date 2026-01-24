"use client";

import { useSyncExternalStore } from "react";
import {
  addToCompare,
  removeFromCompare,
  loadCompareList,
  subscribeCompareList,
} from "@/lib/compare-store";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

type CompareButtonProps = {
  name: string;
};

export default function CompareButton({ name }: CompareButtonProps) {
  // IMPORTANT: hydration-safe read.
  // During SSR/hydration we return an empty list, then subscribe to the real
  // localStorage-backed store after hydration completes.
  const compareList = useSyncExternalStore(subscribeCompareList, loadCompareList, () => []);

  const lower = name.toLowerCase();
  const isActive = compareList.some((item) => item.toLowerCase() === lower);

  const handleClick = () => {
    if (isActive) removeFromCompare(name);
    else addToCompare(name);
    // No local state: updates propagate via COMPARE_UPDATED_EVENT + storage events.
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={ACTION_BUTTON_CLASSES}
      aria-pressed={isActive}
    >
      {isActive ? (
        <>
          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
            <path
              d="M3.5 8.25l2.75 2.75 6.25-6.25"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          In compare
        </>
      ) : (
        "Add to compare"
      )}
    </button>
  );
}
