"use client";

import { useState } from "react";
import { addToCompare, removeFromCompare, loadCompareList } from "@/lib/compare-store";

type CompareButtonProps = {
  name: string;
};

export default function CompareButton({ name }: CompareButtonProps) {
  const [compareList, setCompareList] = useState<string[]>(() => loadCompareList());
  const isActive = compareList.some((item) => item.toLowerCase() === name.toLowerCase());

  const handleClick = () => {
    const nextList = isActive ? removeFromCompare(name) : addToCompare(name);
    setCompareList(nextList);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="h-11 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-slate-100 transition hover:border-white/20 hover:bg-white/10"
    >
      {isActive ? "Added to compare" : "Add to compare"}
    </button>
  );
}
