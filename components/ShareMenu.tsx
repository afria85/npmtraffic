"use client";

import { useCallback, useState } from "react";

import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

type NavigatorWithShare = Navigator & {
  share?: (data: ShareData) => Promise<void>;
};

export type ShareMenuProps = {
  url: string;
  title: string;
  /** If true, render icon-only on <sm breakpoints while keeping an accessible label. */
  iconOnlyOnMobile?: boolean;
};

function ShareIcon() {
  // Modern "share" glyph: three nodes connected (familiar across platforms).
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="18" cy="5" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="19" r="2" />
      <path d="M8 12l8-6" />
      <path d="M8 12l8 6" />
    </svg>
  );
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "true");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export default function ShareMenu({ url, title, iconOnlyOnMobile }: ShareMenuProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  const onShare = useCallback(async () => {
    const nav = navigator as NavigatorWithShare;

    if (nav.share) {
      try {
        await nav.share({ title, url });
        setStatus("idle");
        return;
      } catch {
        // user cancelled or share failed -> fall back to copy
      }
    }

    const ok = await copyToClipboard(url);
    setStatus(ok ? "copied" : "failed");
    window.setTimeout(() => setStatus("idle"), 1200);
  }, [title, url]);

  const labelText = status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Share";
  const iconOnly = Boolean(iconOnlyOnMobile);

  return (
    <button
      type="button"
      className={
        iconOnly
          ? `${ACTION_BUTTON_CLASSES} w-10 px-0 border-transparent bg-transparent hover:bg-white/5 hover:border-transparent sm:w-auto sm:px-3`
          : `${ACTION_BUTTON_CLASSES} inline-flex items-center gap-2`
      }
      aria-label={iconOnly ? labelText : undefined}
      title={iconOnly ? labelText : undefined}
      onClick={onShare}
    >
      <ShareIcon />
      {iconOnly ? <span className="hidden sm:inline">{labelText}</span> : <span>{labelText}</span>}
    </button>
  );
}
