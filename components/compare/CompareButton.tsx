"use client";

import { useEffect, useState } from "react";
import { addToCompare, removeFromCompare, loadCompareList } from "@/lib/compare-store";

type CompareButtonProps = {
  name: string;
};

export default function CompareButton({ name }: CompareButtonProps) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const list = loadCompareList();
    setIsActive(list.some((item) => item.toLowerCase() === name.toLowerCase()));
  }, [name]);

  const handleClick = () => {
    if (isActive) {
      const list = removeFromCompare(name);
      setIsActive(list.some((item) => item.toLowerCase() === name.toLowerCase()));
      return;
    }
    const list = addToCompare(name);
    setIsActive(list.some((item) => item.toLowerCase() === name.toLowerCase()));
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
