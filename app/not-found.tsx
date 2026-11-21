import Link from "next/link";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

export default function NotFound() {
  return (
    <main className="min-h-full px-6 py-16">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--foreground-tertiary)]">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-[var(--foreground-tertiary)]">
          The requested page or npm package could not be found.
        </p>
        <Link
          href="/"
          className={`${ACTION_BUTTON_CLASSES} mt-6 self-center`}
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
