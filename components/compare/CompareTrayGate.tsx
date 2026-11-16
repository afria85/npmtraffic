"use client";

import { useCallback, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useHydrated } from "@/lib/hydrated";
import { loadCompareList, subscribeCompareList } from "@/lib/compare-store";
import CompareTray from "@/components/compare/CompareTray";

const EMPTY_SNAPSHOT: string[] = [];
const getEmptySnapshot = () => EMPTY_SNAPSHOT;

export default function CompareTrayGate() {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const getClientSnapshot = useCallback(() => {
    return hydrated ? loadCompareList() : EMPTY_SNAPSHOT;
  }, [hydrated]);

  const compareList = useSyncExternalStore(
    subscribeCompareList,
    getClientSnapshot,
    getEmptySnapshot
  );

  // Compare already has its own package picker with remove actions. Showing the
  // global tray there duplicates the selected packages and the Compare CTA.
  // Other routes keep the tray so selections remain accessible while browsing.
  if (pathname === "/compare" || !compareList.length) return null;
  return <CompareTray />;
}
