"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  addToCompare,
  loadCompareList,
  removeFromCompare,
  subscribeCompareList,
} from "@/lib/compare-store";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

type CompareButtonProps = {
  name: string;
};

// React requires getServerSnapshot to return a cached value.
const EMPTY_SNAPSHOT: string[] = [];
const getEmptySnapshot = () => EMPTY_SNAPSHOT;

function includesPackage(list: string[], name: string) {
  const needle = name.toLowerCase();
  return list.some((item) => item.toLowerCase() === needle);
}

export default function CompareButton({ name }: CompareButtonProps) {
  // Hydration-safe: server snapshot is always empty; client picks up localStorage after mount.
  const compareList = useSyncExternalStore(subscribeCompareList, loadCompareList, getEmptySnapshot);

  const isActive = useMemo(() => includesPackage(compareList, name), [compareList, name]);

  const handleClick = useCallback(() => {
    if (isActive) {
      removeFromCompare(name);
    } else {
      addToCompare(name);
    }
  }, [isActive, name]);

  return (
    <button type="button" onClick={handleClick} className={ACTION_BUTTON_CLASSES} aria-pressed={isActive}>
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
