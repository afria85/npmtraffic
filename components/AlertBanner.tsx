"use client";

type AlertBannerProps = {
  message: string;
  variant?: "error" | "info";
  className?: string;
};

const VARIANT_STYLES: Record<Required<AlertBannerProps>["variant"], string> = {
  error: "border border-rose-500/30 bg-rose-500/10 text-rose-100",
  info: "border border-amber-500/30 bg-amber-500/10 text-amber-100",
};

export default function AlertBanner({ message, variant = "error", className = "" }: AlertBannerProps) {
  return (
    <div className={["rounded-lg px-3 py-2 text-sm", VARIANT_STYLES[variant], className].join(" ")}>
      {message}
    </div>
  );
}
