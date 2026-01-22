const numberFormatter = new Intl.NumberFormat("en-US");

type Props = {
  value: number | null;
};

export default function DeltaValue({ value }: Props) {
  if (value == null) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-500">
        —
        <span className="sr-only">No delta available</span>
      </span>
    );
  }

  const positive = value > 0;
  const negative = value < 0;
  const textColor = positive ? "text-emerald-300" : negative ? "text-rose-300" : "text-slate-300";
  const displayValue = numberFormatter.format(Math.abs(value));
  const symbol = positive ? "+" : negative ? "−" : "";
  const arrow = positive ? "▲" : negative ? "▼" : "";
  const srText = positive
    ? `increase of ${numberFormatter.format(value)}`
    : negative
    ? `decrease of ${numberFormatter.format(Math.abs(value))}`
    : "no change";

  return (
    <span className={`inline-flex items-center gap-1 font-mono text-xs ${textColor}`}>
      <span aria-hidden="true">
        {symbol}
        {displayValue}
        {arrow ? ` ${arrow}` : ""}
      </span>
      <span className="sr-only">{srText}</span>
    </span>
  );
}
