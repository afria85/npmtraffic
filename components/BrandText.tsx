type BrandTextProps = {
  className?: string;
  size?: "xs" | "sm" | "md";
};

const sizeClasses: Record<NonNullable<BrandTextProps["size"]>, string> = {
  xs: "text-sm",
  sm: "text-base",
  md: "text-lg",
};

export default function BrandText({ className = "", size = "xs" }: BrandTextProps) {
  return (
    <span className={`inline-flex items-baseline font-semibold tracking-tight ${sizeClasses[size]} ${className}`}>
      <span className="text-[var(--accent)]">npm</span>
      <span className="text-[var(--foreground)]">traffic</span>
    </span>
  );
}
