"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  COMPARE_UPDATED_EVENT,
  buildCompareUrl,
  loadCompareList,
} from "@/lib/compare-store";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

export default function CompareLink() {
  const [list, setList] = useState<string[]>(() => loadCompareList());

  useEffect(() => {
    const handleUpdate = () => setList(loadCompareList());
    window.addEventListener(COMPARE_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(COMPARE_UPDATED_EVENT, handleUpdate);
  }, []);

  const url = buildCompareUrl(list, 30);
  if (!url) return null;

  return (
    <Link href={url} className={ACTION_BUTTON_CLASSES}>
      Compare ({list.length})
    </Link>
  );
}
