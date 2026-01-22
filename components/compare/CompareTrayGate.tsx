"use client";

import { usePathname } from "next/navigation";
import CompareTray from "@/components/compare/CompareTray";
import { isCompareTrayAllowed } from "@/lib/compare-tray";

export default function CompareTrayGate() {
  const pathname = usePathname() ?? "/";
  if (!isCompareTrayAllowed(pathname)) return null;
  return <CompareTray />;
}
