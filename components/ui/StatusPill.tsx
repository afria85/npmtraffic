export default function StatusPill({ status }: { status: "YES" | "NO" }) {
  const isYes = status === "YES";

  const base =
    "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em]";

  const className = isYes
    ? `${base} border-[color:var(--outlier-pill-border)] bg-[color:var(--outlier-pill-bg)] text-[color:var(--outlier-pill-fg)]`
    : `${base} border-[color:var(--neutral-pill-border)] bg-[color:var(--neutral-pill-bg)] text-[color:var(--neutral-pill-fg)]`;

  return <span className={className}>{status}</span>;
}
