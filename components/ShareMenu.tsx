"use client";

import { useState } from "react";
import ActionMenu from "@/components/ui/ActionMenu";

type Props = {
  url: string;
  className?: string;
};

async function copyToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard unavailable");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export default function ShareMenu({ url, className }: Props) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  const hasWebShare =
    typeof navigator !== "undefined" &&
    typeof (navigator as unknown as { share?: unknown }).share === "function";

  const handleCopy = async () => {
    try {
      await copyToClipboard(url);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 1800);
    }
  };

  const handleShare = async () => {
    try {
      if (hasWebShare) {
        const n = navigator as unknown as { share: (data: { url: string }) => Promise<void> };
        await n.share({ url });
        return;
      }
      await handleCopy();
    } catch (err: unknown) {
      const name =
        err && typeof err === "object" && "name" in err ? String((err as { name?: unknown }).name) : "";
      if (name === "AbortError") return;
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 1800);
    }
  };

  const label = status === "copied" ? "Link copied" : status === "error" ? "Copy failed" : "Share";

  const items = [
    { key: "share", label: "Share...", onClick: handleShare },
    { key: "copy", label: "Copy link", onClick: handleCopy },
  ];

  return <ActionMenu label={label} items={items} className={className} />;
}
