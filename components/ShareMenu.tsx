"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

type NavigatorWithShare = Navigator & {
  share?: (data: ShareData) => Promise<void>;
};

export type ShareMenuProps = {
  url: string;
  title: string;
  /** If true, render icon-only on <sm breakpoints while keeping an accessible label. */
  iconOnlyOnMobile?: boolean;
  className?: string;
};

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
      aria-hidden
    >
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M16 6l-4-4-4 4" />
      <path d="M12 2v14" />
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
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function ShareMenu({ url, title, iconOnlyOnMobile, className }: ShareMenuProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  const close = useCallback(() => {
    setOpen(false);
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (!target) return;
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (trigger?.contains(target) || menu?.contains(target)) return;
      close();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  const onShare = async () => {
    const nav = navigator as NavigatorWithShare;
    if (nav.share) {
      try {
        await nav.share({ title, url });
        close();
        return;
      } catch {
        // user cancelled or share failed -> fall back to copy
      }
    }

    const ok = await copyToClipboard(url);
    setStatus(ok ? "copied" : "failed");
    setTimeout(() => setStatus("idle"), 1200);
    if (ok) close();
  };

  const onCopy = async () => {
    const ok = await copyToClipboard(url);
    setStatus(ok ? "copied" : "failed");
    setTimeout(() => setStatus("idle"), 1200);
    if (ok) close();
  };

  const labelText = status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Share";
  const compact = Boolean(iconOnlyOnMobile);

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        className={
          compact
            ? `${ACTION_BUTTON_CLASSES} w-11 px-0 border-transparent bg-transparent hover:bg-white/5 hover:border-transparent`
            : `${ACTION_BUTTON_CLASSES} inline-flex items-center gap-2`
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-label={compact ? labelText : undefined}
        title={compact ? labelText : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <ShareIcon />
        {compact ? null : (
          <>
            <span>{labelText}</span>
            <span aria-hidden className="text-slate-300">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M5.25 7.75a.75.75 0 0 1 1.06 0L10 11.44l3.69-3.69a.75.75 0 1 1 1.06 1.06l-4.22 4.22a.75.75 0 0 1-1.06 0L5.25 8.81a.75.75 0 0 1 0-1.06z" />
              </svg>
            </span>
          </>
        )}
      </button>

      {open ? (
        <div
          id={`${id}-menu`}
          ref={menuRef}
          role="menu"
          aria-label="Share menu"
          className="fixed inset-0 z-[2147483647]"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Panel: bottom-sheet on mobile, anchored-ish on desktop */}
          <div className="absolute inset-x-3 bottom-3 sm:inset-auto sm:right-3 sm:top-16">
            <div className="pointer-events-auto w-full overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--surface)] shadow-2xl sm:w-64">
              <div className="p-2">
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-100 hover:bg-white/10"
                  onClick={onShare}
                >
                  Share…
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-100 hover:bg-white/10"
                  onClick={onCopy}
                >
                  Copy link
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
