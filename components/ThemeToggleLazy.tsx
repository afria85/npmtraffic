"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";

const ThemeToggleClient = dynamic(() => import("./ThemeToggle"), {
  ssr: false,
  loading: () => (
    <Button variant="ghost" size="sm" disabled>
      Theme
    </Button>
  ),
});

export default function ThemeToggleLazy() {
  return <ThemeToggleClient />;
}
