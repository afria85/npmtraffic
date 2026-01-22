type Props = {
  value: number | null;
  showArrow?: boolean;
  emphasis?: "primary" | "secondary";
  precision?: number;
};

function formatNumber(value: number, precision?: number) {
  const hasPrecision = typeof precision === "number";
  const options: Intl.NumberFormatOptions = {
    maximumFractionDigits: hasPrecision ? precision : value % 1 === 0 ? 0 : 1,
  };
  if (hasPrecision) {
    options.minimumFractionDigits = precision;
  }
  return new Intl.NumberFormat("en-US", options).format(value);
}

export default function SignedValue({ value, showArrow = false, emphasis = "primary", precision }: Props) {
  if (value == null) {
    return (
      <span className="inline-flex items-center font-mono text-xs tabular-nums text-slate-500">
        —
        <span className="sr-only">Value unavailable</span>
      </span>
    );
  }

  const positive = value > 0;
  const negative = value < 0;
  const textColor =
    positive || negative
      ? positive
        ? "text-emerald-300"
        : "text-rose-300"
      : emphasis === "secondary"
      ? "text-slate-400"
      : "text-slate-300";
  const formatted = formatNumber(Math.abs(value), precision);
  const sign = positive ? "+" : negative ? "−" : "";
  const arrow = showArrow && value !== 0 ? (positive ? "▲" : "▼") : "";
  const srText = positive
    ? `increase of ${formatted}`
    : negative
    ? `decrease of ${formatted}`
    : "no change";

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs tabular-nums whitespace-nowrap ${textColor}`}
    >
      <span aria-hidden="true">
        {sign}
        {formatted}
        {arrow ? ` ${arrow}` : ""}
      </span>
      <span className="sr-only">{srText}</span>
    </span>
  );
}
