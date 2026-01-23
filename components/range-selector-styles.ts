import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

export const PRIMARY_RANGES = [7, 14, 30] as const;
export const MORE_RANGES = [90, 180, 365] as const;

export function primaryButtonClasses(isActive: boolean) {
  return `${ACTION_BUTTON_CLASSES} ${
    isActive ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)] border-[color:var(--accent)]" : "text-[color:var(--foreground)] hover:bg-[color:var(--surface-2)]"
  } h-8 px-2.5 text-[11px] sm:h-11 sm:px-4 sm:text-sm`;
}

export const MORE_SUMMARY_CLASSES =
  `${ACTION_BUTTON_CLASSES} list-none h-8 px-2.5 text-[11px] font-semibold sm:h-11 sm:px-4 sm:text-sm`;

export function moreItemClasses(isActive: boolean) {
  return `rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] ${
    isActive ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)]" : "text-[color:var(--foreground)] hover:bg-[color:var(--surface-2)]"
  }`;
}
