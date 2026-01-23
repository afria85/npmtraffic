export default function StatusPill({ status }: { status: "YES" | "NO" }) {
  const isYes = status === "YES";

  const className =
    "inline-flex h-5 items-center justify-center rounded-full border px-2 " +
    "text-[10px] font-semibold uppercase tracking-[0.25em] leading-none";

  const style = isYes
    ? {
        backgroundColor: "var(--pill-yes-bg)",
        borderColor: "var(--pill-yes-border)",
        color: "var(--pill-yes-fg)",
      }
    : {
        backgroundColor: "var(--pill-no-bg)",
        borderColor: "var(--pill-no-border)",
        color: "var(--pill-no-fg)",
      };

  return (
    <span className={className} style={style}>
      {status}
    </span>
  );
}
