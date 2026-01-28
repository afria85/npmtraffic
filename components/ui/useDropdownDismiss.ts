import { useEffect, useRef } from "react";

type MaybeEl = HTMLElement | null | undefined;
type ElRef = React.RefObject<HTMLElement | null>;

export type UseDropdownDismissOptions = {
  /** Whether the dropdown/menu is currently open. */
  open: boolean;
  /**
   * Called when the dropdown/menu should be dismissed.
   * Prefer `onDismiss`; `onClose` is supported for backwards-compatibility.
   */
  onDismiss?: () => void;
  /** Backwards-compatibility alias for `onDismiss`. */
  onClose?: () => void;
  /**
   * One or more refs that represent "inside" click areas (e.g. trigger + menu panel).
   * You may pass an inline array; the hook internally keeps the latest value without
   * requiring you to memoize to satisfy exhaustive-deps.
   */
  refs?: ElRef[];
  /**
   * Optional function that returns additional "inside" container elements.
   * Useful for portal-based menus where the menu node isn't reachable via local refs.
   */
  getContainers?: () => MaybeEl[];
  /** Close on Escape key. Default: true */
  closeOnEscape?: boolean;
  /** Close on outside pointer down (mouse/touch/pen). Default: true */
  closeOnOutsidePointerDown?: boolean;

  /** Optional additional keyboard handling (Arrow keys, etc). Escape is handled for you. */
  onKeyDown?: (event: KeyboardEvent) => void;
};

/**
 * Unified dropdown dismiss behavior:
 * - Outside click/tap closes
 * - Escape closes
 *
 * This hook is intentionally written to avoid react-hooks/exhaustive-deps warnings
 * in callsites (e.g. passing `[triggerRef, menuRef]` inline), by storing the latest
 * refs/callbacks in mutable refs.
 */
export function useDropdownDismiss(options: UseDropdownDismissOptions) {
  const {
    open,
    onDismiss,
    onClose,
    refs,
    getContainers,
    closeOnEscape = true,
    closeOnOutsidePointerDown = true,
    onKeyDown,
  } = options;

  const dismiss = onDismiss ?? onClose;
  const onDismissRef = useRef(dismiss);
  const onKeyDownRef = useRef(onKeyDown);
  const refsRef = useRef<ElRef[] | undefined>(refs);
  const getContainersRef = useRef<UseDropdownDismissOptions["getContainers"]>(getContainers);

  useEffect(() => {
    onDismissRef.current = onDismiss ?? onClose;
  }, [onDismiss, onClose]);

  useEffect(() => {
    onKeyDownRef.current = onKeyDown;
  }, [onKeyDown]);

  useEffect(() => {
    refsRef.current = refs;
  }, [refs]);

  useEffect(() => {
    getContainersRef.current = getContainers;
  }, [getContainers]);

  useEffect(() => {
    if (!open) return;
    // If neither callback is provided, do nothing (defensive; should not happen).
    if (!onDismissRef.current) return;

    const resolveContainers = (): HTMLElement[] => {
      const fromRefs =
        refsRef.current?.map((r) => r.current).filter((el): el is HTMLElement => !!el) ?? [];
      const fromFn =
        getContainersRef.current?.()?.filter((el): el is HTMLElement => !!el) ?? [];
      return Array.from(new Set([...fromRefs, ...fromFn]));
    };

    const isInside = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      const containers = resolveContainers();
      for (const el of containers) {
        if (el.contains(target)) return true;
      }
      return false;
    };

    const handlePointerDown = (e: Event) => {
      if (!closeOnOutsidePointerDown) return;
      if (isInside(e.target)) return;
      onDismissRef.current?.();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Forward to optional handler first (only when the key event originates inside the dropdown).
      if (onKeyDownRef.current && isInside(e.target)) {
        onKeyDownRef.current(e);
      }

      if (!closeOnEscape) return;
      if (e.key === "Escape") onDismissRef.current?.();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open, closeOnEscape, closeOnOutsidePointerDown]);
}
