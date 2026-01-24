"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { isCompareTrayAllowed } from "@/lib/compare-tray";

const CompareTray = dynamic(() => import("@/components/compare/CompareTray"), { ssr: false });

export default function CompareTrayGate() {
  const pathname = usePathname() ?? "/";
  if (!isCompareTrayAllowed(pathname)) return null;
  return <CompareTray />;
}
