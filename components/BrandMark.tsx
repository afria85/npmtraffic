import React, { useId } from "react";

type BrandMarkVariant = "ui" | "solid";

export default function BrandMark({
  className = "",
  title = "npmtraffic",
  variant = "ui",
}: {
  className?: string;
  title?: string;
  variant?: BrandMarkVariant;
}) {
  // useId() may contain ":"; sanitize to keep SVG ids safe in url(#id)
  const uid = useId().replace(/:/g, "_");
  const barGradId = `nt_bar_${uid}`;
  const midGradId = `nt_mid_${uid}`;

  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {variant === "ui" ? (
        <defs>
          {/* Pillars: subtle vertical gradient */}
          <linearGradient id={barGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#0891b2" />
          </linearGradient>

          {/* Middle stroke: brighter highlight */}
          <linearGradient id={midGradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#67e8f9" />
            <stop offset="1" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      ) : null}

      {/* Left pillar (full height) */}
      <rect
        x="0"
        y="0"
        width="14"
        height="48"
        rx="3"
        fill={variant === "ui" ? `url(#${barGradId})` : "#06b6d4"}
      />

      {/* Middle skewed stroke (shorter, so it reads as an "N") */}
      <polygon
        points="16,0 28,0 32,28 20,28"
        fill={variant === "ui" ? `url(#${midGradId})` : "#22d3ee"}
      />

      {/* Right pillar (full height) */}
      <rect
        x="34"
        y="0"
        width="14"
        height="48"
        rx="3"
        fill={variant === "ui" ? `url(#${barGradId})` : "#0891b2"}
      />
    </svg>
  );
}
