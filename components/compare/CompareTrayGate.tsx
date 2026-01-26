"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isCompareTrayAllowed } from "@/lib/compare-tray";
import { buildCompareUrl } from "@/lib/compare-store";
import { clampDays } from "@/lib/query";

const CompareTray = dynamic(() => import("@/components/compare/CompareTray"), { ssr: false });

export default function CompareTrayGate() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const searchParams = useSearchParams();

  const days = clampDays(searchParams?.get("days") ?? undefined);
  if (!isCompareTrayAllowed(pathname)) return null;
  return (
    <CompareTray
      pathname={pathname}
      compareDays={days}
      onNavigateToCompareRoot={() => router.replace("/compare")}
      onSyncCompareUrl={(packages, nextDays) => {
        const next = buildCompareUrl(packages, nextDays);
        router.replace(next ?? "/compare");
      }}
    />
  );
}
