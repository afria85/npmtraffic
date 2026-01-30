"use client";

import { useCallback, useMemo, useState } from "react";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";
import { copyToClipboard } from "@/lib/clipboard";

type NavigatorWithShare = Navigator & {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data?: ShareData) => boolean;
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

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function isAbortError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const maybe = err as { name?: unknown };
  return maybe.name === "AbortError";
}

/**
 * Check Web Share API support at runtime.
 */
function canUseNativeShare(_title: string, url: string): boolean {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext) return false;
  if (!url) return false;

  const nav = navigator as NavigatorWithShare;
  return typeof nav.share === "function";
}

/**
 * ShareMenu - Simplified share button
 * 
 * Behavior:
 * 1. Click → Try native share (if available) → Opens OS share sheet
 * 2. If native share not available or fails → Copy link + show feedback
 * 
 * Always shows "Share" label - handles fallback gracefully.
 */
export default function ShareMenu({ url, title, iconOnlyOnMobile }: ShareMenuProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed" | "shared">("idle");

  const resetSoon = useCallback((ms: number) => {
    window.setTimeout(() => setStatus("idle"), ms);
  }, []);

  const handleClick = useCallback(async () => {
    const nav = navigator as NavigatorWithShare;

    // Check at click-time if native share is available
    const nativeShareAvailable = canUseNativeShare(title, url);
    
    if (nativeShareAvailable && typeof nav.share === "function") {
      try {
        await nav.share({ title, url });
        setStatus("shared");
        resetSoon(1200);
        return;
      } catch (err) {
        // User cancelled - do nothing
        if (isAbortError(err)) return;
        // Native share failed, fall through to copy
      }
    }

    // Fallback: copy to clipboard directly
    const ok = await copyToClipboard(url);
    setStatus(ok ? "copied" : "failed");
    resetSoon(ok ? 1800 : 2500);
  }, [title, url, resetSoon]);

  // Determine button content based on status
  const { labelText, Icon } = useMemo(() => {
    switch (status) {
      case "copied":
        return { labelText: "Copied!", Icon: CheckIcon };
      case "shared":
        return { labelText: "Shared", Icon: CheckIcon };
      case "failed":
        return { labelText: "Failed", Icon: ShareIcon };
      default:
        // Always show "Share" - it will either open native sheet or copy
        return { labelText: "Share", Icon: ShareIcon };
    }
  }, [status]);

  const iconOnly = Boolean(iconOnlyOnMobile);
  
  const buttonContent = (
    <span className="inline-flex items-center gap-2">
      <Icon />
      {iconOnly ? (
        <span className="hidden sm:inline">{labelText}</span>
      ) : (
        <span>{labelText}</span>
      )}
    </span>
  );

  const buttonClassName = iconOnly
    ? `${ACTION_BUTTON_CLASSES} h-11 w-11 px-0 sm:h-10 sm:w-auto sm:px-4`
    : `${ACTION_BUTTON_CLASSES} inline-flex items-center gap-2`;

  // Add success state styling
  const stateClassName = status === "copied" || status === "shared" 
    ? "!text-green-500 !border-green-500/30" 
    : status === "failed" 
      ? "!text-red-500 !border-red-500/30" 
      : "";

  return (
    <button
      type="button"
      className={`${buttonClassName} ${stateClassName} transition-colors duration-200`}
      aria-label="Share"
      title="Share this page"
      onClick={handleClick}
    >
      {buttonContent}
    </button>
  );
}
