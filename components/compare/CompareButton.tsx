"use client";

import { useState } from "react";
import { addToCompare, removeFromCompare, loadCompareList } from "@/lib/compare-store";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

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
    className={ACTION_BUTTON_CLASSES}
    >
      {isActive ? "Added to compare" : "Add to compare"}
    </button>
  );
}
