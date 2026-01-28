export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-[var(--surface-hover)]${className ? ` ${className}` : ""}`}
    />
  );
}
