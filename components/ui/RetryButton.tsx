"use client";

import { useRouter } from "next/navigation";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

type RetryButtonProps = {
  className?: string;
  label?: string;
};

export default function RetryButton({ className, label = "Retry" }: RetryButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={`${ACTION_BUTTON_CLASSES}${className ? ` ${className}` : ""}`}
      onClick={() => router.refresh()}
    >
      {label}
    </button>
  );
}
