"use client";

import { useState } from "react";

type Props = {
  canonical: string;
  label?: string;
};

export default function CopyLinkButton({ canonical, label = "Copy link" }: Props) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(canonical);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = canonical;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  };

  const labelText =
    status === "copied" ? "Link copied" : status === "error" ? "Copy failed" : label;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="h-11 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-slate-100 transition hover:border-white/20 hover:bg-white/10"
    >
      {labelText}
    </button>
  );
}
