type Props = {
  status: "YES" | "NO";
};

export default function StatusPill({ status }: Props) {
  const isYes = status === "YES";
  const baseClasses =
    "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.35em] uppercase";
  const variantClasses = isYes
    ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
    : "bg-white/5 border-white/10 text-slate-400";
  return <span className={`${baseClasses} ${variantClasses}`}>{status}</span>;
}
