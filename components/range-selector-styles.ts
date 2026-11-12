import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

export const PRIMARY_RANGES = [7, 14, 30] as const;
export const MORE_RANGES = [90, 180, 365] as const;

// Apply the selected foreground and background together when the theme changes.
const SELECTED_RANGE_CLASSES = "!bg-[var(--accent)] !text-[var(--accent-foreground)] !transition-none";

export function primaryButtonClasses(isActive: boolean) {
  return `${ACTION_BUTTON_CLASSES} ${
    isActive ? `${SELECTED_RANGE_CLASSES} !border-[var(--accent)]` : "text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
  } h-8 px-2.5 text-[11px] sm:h-11 sm:px-4 sm:text-sm`;
}

export const MORE_SUMMARY_CLASSES =
  `${ACTION_BUTTON_CLASSES} list-none h-8 px-2.5 text-[11px] font-semibold sm:h-11 sm:px-4 sm:text-sm`;

export function moreItemClasses(isActive: boolean) {
  return `rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
    isActive ? SELECTED_RANGE_CLASSES : "text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
  }`;
}
