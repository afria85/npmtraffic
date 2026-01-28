"use client";

import { useCallback, useMemo, useState } from "react";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

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

function CopyIcon() {
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
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
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

function isAbortError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const maybe = err as { name?: unknown };
  return maybe.name === "AbortError";
}

/**
 * ShareMenu - Simplified share button
 * 
 * Behavior:
 * 1. If native share is available → Opens OS share sheet (which already has copy option)
 * 2. If native share NOT available → Copies link directly and shows feedback
 * 
 * NO dropdown menu - one click, one action.
 */
export default function ShareMenu({ url, title, iconOnlyOnMobile }: ShareMenuProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed" | "shared">("idle");

  const resetSoon = useCallback((ms: number) => {
    window.setTimeout(() => setStatus("idle"), ms);
  }, []);

  const supportsNativeShare = useMemo(() => {
    if (typeof window === "undefined") return false;
    if (!window.isSecureContext) return false;

    const nav = navigator as NavigatorWithShare;
    if (typeof nav.share !== "function") return false;

    if (typeof nav.canShare === "function") {
      try {
        return nav.canShare({ title, url });
      } catch {
        return true;
      }
    }

    return true;
  }, [title, url]);

  const handleClick = useCallback(async () => {
    const nav = navigator as NavigatorWithShare;

    // Try native share first
    if (supportsNativeShare && typeof nav.share === "function") {
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
  }, [supportsNativeShare, title, url, resetSoon]);

  // Determine button content based on status
  const { labelText, Icon } = useMemo(() => {
    switch (status) {
      case "copied":
        return { labelText: "Copied!", Icon: CheckIcon };
      case "shared":
        return { labelText: "Shared", Icon: CheckIcon };
      case "failed":
        return { labelText: "Failed", Icon: CopyIcon };
      default:
        // Show different icon based on capability
        return { 
          labelText: supportsNativeShare ? "Share" : "Copy link", 
          Icon: supportsNativeShare ? ShareIcon : CopyIcon 
        };
    }
  }, [status, supportsNativeShare]);

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
      aria-label={supportsNativeShare ? "Share" : "Copy link"}
      title={supportsNativeShare ? "Share this page" : "Copy link to clipboard"}
      onClick={handleClick}
    >
      {buttonContent}
    </button>
  );
}
