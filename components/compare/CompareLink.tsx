"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildCompareUrl, loadCompareList } from "@/lib/compare-store";

export default function CompareLink() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const list = loadCompareList();
    setUrl(buildCompareUrl(list, 30));
  }, []);

  if (!url) return null;

  return (
    <Link
      href={url}
      className="h-11 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-slate-100 transition hover:border-white/20 hover:bg-white/10"
    >
      Compare packages
    </Link>
  );
}
