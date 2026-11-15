"use client";

import { useCallback, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useHydrated } from "@/lib/hydrated";
import { loadCompareList, subscribeCompareList } from "@/lib/compare-store";
import CompareTray from "@/components/compare/CompareTray";
import { COMPARE_TRAY_SLOT_ID } from "@/lib/compare-ui";

const EMPTY_SNAPSHOT: string[] = [];
const getEmptySnapshot = () => EMPTY_SNAPSHOT;

const compactViewport = "(width < 64rem)";
const getDesktopSnapshot = () => false;

function isCompactViewport() {
  return window.matchMedia(compactViewport).matches;
}

export default function CompareTrayGate() {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const pendingFocus = useRef<string | undefined>(undefined);
  const subscribeToViewport = useCallback((notify: () => void) => {
    const media = window.matchMedia(compactViewport);
    function onChange() {
      if (pathname === "/compare") {
        const active = document.activeElement;
        pendingFocus.current = active instanceof HTMLElement ? active.dataset.compareTrayAction : undefined;
      }
      notify();
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [pathname]);
  const compact = useSyncExternalStore(subscribeToViewport, isCompactViewport, getDesktopSnapshot);

  useLayoutEffect(() => {
    const action = pendingFocus.current;
    pendingFocus.current = undefined;
    // Moving between portal containers remounts the tray. Keep the user's
    // position in its tab order only when that move removed the focused node.
    if (!action || pathname !== "/compare" || document.activeElement !== document.body) return;
    document.querySelector<HTMLElement>('[data-compare-tray-action="' + CSS.escape(action) + '"]')
      ?.focus({ preventScroll: true });
  }, [compact, pathname]);

  const getClientSnapshot = useCallback(() => {
    return hydrated ? loadCompareList() : EMPTY_SNAPSHOT;
  }, [hydrated]);

  const compareList = useSyncExternalStore(
    subscribeCompareList,
    getClientSnapshot,
    getEmptySnapshot
  );

  if (!compareList.length) return null;
  if (pathname === "/compare" && compact) {
    // The URL can populate the compare store after the chart has streamed in.
    // Mount the tray below the page so that update cannot push the chart down.
    const slot = document.getElementById(COMPARE_TRAY_SLOT_ID);
    if (slot) return createPortal(<CompareTray reserveMobileSpace={false} />, slot);
  }
  return <CompareTray />;
}
