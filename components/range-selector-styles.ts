import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

export const PRIMARY_RANGES = [7, 14, 30] as const;
export const MORE_RANGES = [90, 180, 365] as const;

export function primaryButtonClasses(isActive: boolean) {
  return `${ACTION_BUTTON_CLASSES} ${
    isActive ? "bg-white text-black border-white" : "text-slate-200 hover:bg-white/10"
  }`;
}

export const MORE_SUMMARY_CLASSES =
  `${ACTION_BUTTON_CLASSES} list-none text-[0.65rem] font-semibold tracking-[0.25em]`;

export function moreItemClasses(isActive: boolean) {
  return `rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
    isActive ? "bg-white text-black" : "text-slate-200 hover:bg-white/10"
  }`;
}
