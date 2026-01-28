"use client";

import { useCallback, useMemo, useState } from "react";

import ActionMenu from "@/components/ui/ActionMenu";
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

export default function ShareMenu({ url, title, iconOnlyOnMobile }: ShareMenuProps) {
  // Keep this small/simple: visible label feedback without surprising fallbacks.
  const [status, setStatus] = useState<"idle" | "copied" | "failed" | "shared">("idle");

  const resetSoon = useCallback((ms: number) => {
    window.setTimeout(() => setStatus("idle"), ms);
  }, []);

  const supportsNativeShare = useMemo(() => {
    if (typeof window === "undefined") return false;

    // Web Share is generally gated to secure contexts.
    if (!window.isSecureContext) return false;

    const nav = navigator as NavigatorWithShare;
    if (typeof nav.share !== "function") return false;

    if (typeof nav.canShare === "function") {
      try {
        // Some implementations validate inputs in canShare().
        return nav.canShare({ title, url });
      } catch {
        return true;
      }
    }

    return true;
  }, [title, url]);

  const onCopy = useCallback(async () => {
    const ok = await copyToClipboard(url);
    setStatus(ok ? "copied" : "failed");
    resetSoon(ok ? 1200 : 1800);
  }, [url, resetSoon]);

  const onShare = useCallback(async () => {
    const nav = navigator as NavigatorWithShare;

    if (!supportsNativeShare || typeof nav.share !== "function") {
      // Do not silently fall back to copy here; keep copy as an explicit action.
      setStatus("failed");
      resetSoon(1800);
      return;
    }

    try {
      await nav.share({ title, url });
      setStatus("shared");
      resetSoon(1200);
    } catch (err) {
      // User cancellation should not look like a failure.
      if (isAbortError(err)) return;
      setStatus("failed");
      resetSoon(1800);
    }
  }, [supportsNativeShare, title, url, resetSoon]);

  const labelText = useMemo(() => {
    if (status === "copied") return "Copied";
    if (status === "shared") return "Shared";
    if (status === "failed") return "Failed";
    return "Share";
  }, [status]);

  const iconOnly = Boolean(iconOnlyOnMobile);
  const buttonContent = (
    <span className="inline-flex items-center gap-2">
      <ShareIcon />
      {iconOnly ? <span className="hidden sm:inline">{labelText}</span> : <span>{labelText}</span>}
    </span>
  );

  const buttonClassName = iconOnly
    ? `${ACTION_BUTTON_CLASSES} h-11 w-11 px-0 sm:h-10 sm:w-auto`
    : `${ACTION_BUTTON_CLASSES} inline-flex items-center gap-2`;

  // Preferred UX: if the platform supports native share (mobile + some desktops),
  // clicking Share should open the OS share sheet directly.
  if (supportsNativeShare) {
    return (
      <button type="button" className={buttonClassName} aria-label="Share" title="Share" onClick={onShare}>
        {buttonContent}
      </button>
    );
  }

  // Fallback UX: internal menu with explicit actions.
  return (
    <ActionMenu
      ariaLabel="Share"
      label={buttonContent}
      buttonClassName={buttonClassName}
      items={[
        { key: "share", label: "Share\u2026", onClick: onShare },
        { key: "copy", label: "Copy link", onClick: onCopy },
      ]}
    />
  );
}
