export default function StatusPill({ status }: { status: "YES" | "NO" }) {
  const isYes = status === "YES";

  // Ensure sufficient contrast in both light and dark themes.
  const className = isYes
    ? "inline-flex h-5 items-center justify-center rounded-full border border-amber-300 bg-amber-100 px-2 text-[10px] font-semibold uppercase tracking-[0.25em] leading-none text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
    : "inline-flex h-5 items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-2 text-[10px] font-semibold uppercase tracking-[0.25em] leading-none text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-400";

  return <span className={className}>{status}</span>;
}
