"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useHydrated } from "@/lib/hydrated";
import { loadCompareList, subscribeCompareList } from "@/lib/compare-store";
import CompareTray from "@/components/compare/CompareTray";

const EMPTY_SNAPSHOT: string[] = [];
const getEmptySnapshot = () => EMPTY_SNAPSHOT;

export default function CompareTrayGate() {
  const hydrated = useHydrated();

  const getClientSnapshot = useCallback(() => {
    return hydrated ? loadCompareList() : EMPTY_SNAPSHOT;
  }, [hydrated]);

  const compareList = useSyncExternalStore(
    subscribeCompareList,
    getClientSnapshot,
    getEmptySnapshot
  );

  if (!compareList.length) return null;
  return <CompareTray />;
}
