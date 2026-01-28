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
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M12 3l4 4m-4-4L8 7" />
      <path d="M12 3v12" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
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
          ? `${ACTION_BUTTON_CLASSES} h-11 w-11 px-0 sm:h-10 sm:w-auto`
          : `${ACTION_BUTTON_CLASSES} inline-flex items-center gap-2`
      }
      aria-label="Share"
      title="Share"
      onClick={onShare}
    >
      <ShareIcon />
      {iconOnly ? <span className="hidden sm:inline">{labelText}</span> : <span>{labelText}</span>}
    </button>
  );
}
