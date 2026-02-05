"use client";

import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";
import { useHydrated } from "@/lib/hydrated";
import { loadCompareList, subscribeCompareList } from "@/lib/compare-store";
import { Button } from "@/components/ui/Button";

const EMPTY_SNAPSHOT: string[] = [];
const getEmptySnapshot = () => EMPTY_SNAPSHOT;

export default function AboutActions() {
  const hydrated = useHydrated();

  const getClientSnapshot = useCallback(() => {
    return hydrated ? loadCompareList() : EMPTY_SNAPSHOT;
  }, [hydrated]);

  const compareList = useSyncExternalStore(
    subscribeCompareList,
    getClientSnapshot,
    getEmptySnapshot
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href="/compare">
        <Button variant="primary" size="sm">
          Compare
        </Button>
      </Link>
      <span className="text-sm text-muted-foreground">
        {compareList.length ? `${compareList.length} in compare` : "No compare list yet"}
      </span>
    </div>
  );
}
