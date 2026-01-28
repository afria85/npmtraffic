"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type RetryButtonProps = {
  className?: string;
  label?: string;
};

export default function RetryButton({ className, label = "Retry" }: RetryButtonProps) {
  const router = useRouter();

  return (
    <Button
      variant="secondary"
      size="sm"
      className={className}
      onClick={() => router.refresh()}
    >
      {label}
    </Button>
  );
}
