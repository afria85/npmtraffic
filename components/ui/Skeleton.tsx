export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-[color:var(--surface-3)]${className ? ` ${className}` : ""}`}
    />
  );
}
