import Link from "next/link";
import BrandMark from "@/components/BrandMark";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  markVariant?: "ui" | "solid";
}

export default function Logo({
  size = "md",
  showText = true,
  className = "",
  markVariant = "ui",
}: LogoProps) {
  // Keep the mark square so it doesn't look compressed.
  const iconSizes: Record<NonNullable<LogoProps["size"]>, string> = {
    sm: "h-6 w-6",
    md: "h-7 w-7",
    lg: "h-10 w-10",
  };

  const textSizes: Record<NonNullable<LogoProps["size"]>, string> = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 transition-opacity hover:opacity-80 ${className}`}
      aria-label="npmtraffic home"
    >
      <BrandMark className={iconSizes[size]} variant={markVariant} />

      {showText && (
        <span className={`${textSizes[size]} font-semibold tracking-tight`}>
          <span className="text-[var(--accent)]">npm</span>
          <span className="text-[var(--foreground)]">traffic</span>
        </span>
      )}
    </Link>
  );
}
