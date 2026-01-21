import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

export const PRIMARY_RANGES = [7, 14, 30] as const;
export const MORE_RANGES = [90, 180, 365] as const;

export function primaryButtonClasses(isActive: boolean) {
  return `${ACTION_BUTTON_CLASSES} ${
    isActive ? "bg-white text-black border-white" : "text-slate-200 hover:bg-white/10"
  }`;
}

export const MORE_SUMMARY_CLASSES =
  `${ACTION_BUTTON_CLASSES} list-none`;

export function moreItemClasses(isActive: boolean) {
  return `${ACTION_BUTTON_CLASSES} ${
    isActive ? "bg-white text-black border-white" : "text-slate-200 hover:bg-white/10"
  }`;
}
