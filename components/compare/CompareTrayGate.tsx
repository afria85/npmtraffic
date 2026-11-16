"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useHydrated } from "@/lib/hydrated";
import { loadCompareList, subscribeCompareList } from "@/lib/compare-store";
import CompareTray from "@/components/compare/CompareTray";
import { COMPARE_TRAY_SLOT_ID } from "@/lib/compare-ui";

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

  if (!compareList.length) return null;
  if (pathname === "/compare") {
    // The URL can populate the compare store after the chart has streamed in.
    // Mount the tray below the page so that update cannot push the chart down.
    const slot = document.getElementById(COMPARE_TRAY_SLOT_ID);
    if (slot) return createPortal(<CompareTray reserveMobileSpace={false} />, slot);
  }
  return <CompareTray />;
}
