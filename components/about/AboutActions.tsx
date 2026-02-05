"use client";

import { useCallback, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/Button";
import { useHydrated } from "@/lib/hydrated";
import { loadCompareList, subscribeCompareList } from "@/lib/compare-store";

const EMPTY_SNAPSHOT: string[] = [];
const getEmptySnapshot = () => EMPTY_SNAPSHOT;

export default function AboutActions() {
  const hydrated = useHydrated();

  const getClientSnapshot = useCallback(() => {
    return hydrated ? loadCompareList() : EMPTY_SNAPSHOT;
  }, [hydrated]);

  const packages = useSyncExternalStore(subscribeCompareList, getClientSnapshot, getEmptySnapshot);

  if (!hydrated || packages.length === 0) return null;

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <a href={`/compare?packages=${encodeURIComponent(packages.join(","))}&days=30`}>
        <Button variant="secondary" size="sm">
          Open compare ({packages.length})
        </Button>
      </a>
    </div>
  );
}
