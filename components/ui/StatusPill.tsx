export default function StatusPill({ status }: { status: "YES" | "NO" }) {
  const isYes = status === "YES";

  // Ensure sufficient contrast in both light and dark themes.
  const className = isYes
    ? "inline-flex items-center justify-center rounded-full border border-amber-400 bg-amber-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
    : "inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-400";

  return <span className={className}>{status}</span>;
}
