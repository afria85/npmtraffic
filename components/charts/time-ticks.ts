/**
 * Chart month tick helpers used by the x-axis.
 *
 * Goals:
 * - Always treat string dates as UTC day boundaries (avoid local TZ shifting).
 * - Support a few common point shapes ({date}, {x}, {ts}, etc.).
 * - When labels are shown sparsely, include the year on the first tick and whenever the year changes.
 */
export type TickMode = "month" | "first-or-change";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}

function isValidDate(d: Date): boolean {
  return Number.isFinite(d.getTime());
}

function parseYMDLike(s: string): Date | null {
  // YYYY-MM-DD (optionally with time suffix)
  const m = /^\s*(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const day = Number(m[3]);
    const d = new Date(Date.UTC(y, mo, day));
    return isValidDate(d) ? d : null;
  }

  // YYYY/MM/DD
  const m2 = /^\s*(\d{4})\/(\d{2})\/(\d{2})\s*$/.exec(s);
  if (m2) {
    const y = Number(m2[1]);
    const mo = Number(m2[2]) - 1;
    const day = Number(m2[3]);
    const d = new Date(Date.UTC(y, mo, day));
    return isValidDate(d) ? d : null;
  }

  // YYYY-MM (month only) -> first day of month
  const m3 = /^\s*(\d{4})-(\d{2})\s*$/.exec(s);
  if (m3) {
    const y = Number(m3[1]);
    const mo = Number(m3[2]) - 1;
    const d = new Date(Date.UTC(y, mo, 1));
    return isValidDate(d) ? d : null;
  }

  return null;
}

function toUTCDate(dateLike: unknown): Date {
  if (dateLike instanceof Date) return dateLike;
  if (typeof dateLike === "number") return new Date(dateLike);

  if (typeof dateLike === "string") {
    const parsed = parseYMDLike(dateLike);
    if (parsed) return parsed;

    // Fallback to built-in parsing (supports e.g. "Dec 2025"), then normalize to UTC day.
    const d = new Date(dateLike);
    if (isValidDate(d)) {
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }
    return d;
  }

  return new Date(NaN);
}

export function formatMonthLabel(a: number, b: number, useFullYear = false): string {
  // Backward-compatible: support both (monthIndex, year) and (year, monthIndex).
  // The tests historically used (year, monthIndex).
  let monthIndex: number;
  let year: number;

  if (a >= 1000 && b >= 0 && b <= 11) {
    year = a;
    monthIndex = b;
  } else if (a >= 1000 && b >= 1 && b <= 12) {
    // tolerate 1-based months if ever provided
    year = a;
    monthIndex = b - 1;
  } else {
    monthIndex = a;
    year = b;
  }

  // Ensure a stable 0..11 month index even if callers pass weird values.
  monthIndex = Math.max(0, Math.min(11, Math.trunc(monthIndex)));

  const m = MONTHS[monthIndex] || "";
  if (!m) return "";

  // `useFullYear` means: include the 4-digit year. If false, return only the month.
  return useFullYear ? `${m} ${year}` : m;
}

export function formatMonthLabelFromDate(dateLike: unknown, useFullYear = false): string {
  const d = toUTCDate(dateLike);
  // Tests expect (year, monthIndex) semantics.
  return formatMonthLabel(d.getUTCFullYear(), d.getUTCMonth(), useFullYear);
}

type TickSourcePoint = { date?: unknown; x?: unknown } & Record<string, unknown>;

function extractDateLike(point: unknown): unknown {
  if (point instanceof Date || typeof point === "number" || typeof point === "string") return point;
  if (!isRecord(point)) return undefined;

  const p = point as TickSourcePoint;
  // Common shapes we use and shapes returned by chart libs
  const r = p as Record<string, unknown>;
  const direct = [
    p.date,
    p.x,
    r["ts"],
    r["t"],
    r["time"],
    r["timestamp"],
  ] as unknown[];

  for (const v of direct) {
    if (v !== undefined && v !== null) return v;
  }

  // Last resort: find any value that looks like a date-ish string/number/Date
  for (const v of Object.values(p)) {
    if (v instanceof Date || typeof v === "number") return v;
    if (typeof v === "string") {
      if (parseYMDLike(v)) return v;
      // Also accept "Dec 2025" style strings
      if (Number.isFinite(new Date(v).getTime())) return v;
    }
  }

  return undefined;
}

export type MonthTick = { index: number; label: string };

export function buildMonthTicks(
  points: Array<TickSourcePoint | string | number | Date>,
  maxTicks = 6,
  modeOrOpts?: TickMode | { mode?: TickMode; useFullYear?: boolean },
  useFullYearMaybe?: boolean,
): MonthTick[] {
  const mode: TickMode =
    typeof modeOrOpts === "string" ? modeOrOpts : modeOrOpts?.mode ?? "month";
  const useFullYear =
    typeof modeOrOpts === "object" ? Boolean(modeOrOpts.useFullYear) : Boolean(useFullYearMaybe);

  if (!points.length) return [];

  const candidateIndices: number[] = [];

  if (mode === "first-or-change") {
    let prevKey = "";
    for (let i = 0; i < points.length; i++) {
      const d = toUTCDate(extractDateLike(points[i]));
      if (!isValidDate(d)) continue;

      const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
      if (i === 0 || key !== prevKey) candidateIndices.push(i);
      prevKey = key;
    }
  } else {
    // Spread roughly evenly across the series.
    const step = Math.max(1, Math.floor(points.length / Math.max(1, maxTicks)));
    for (let i = 0; i < points.length; i += step) candidateIndices.push(i);
    if (candidateIndices[candidateIndices.length - 1] !== points.length - 1) {
      candidateIndices.push(points.length - 1);
    }
  }

  const unique = Array.from(new Set(candidateIndices)).sort((a, b) => a - b).slice(0, maxTicks);

  // Emit labels; include full year on the first tick and whenever the year changes.
  let prevYear: number | null = null;

  return unique
    .map((index) => {
      const d = toUTCDate(extractDateLike(points[index]));
      if (!isValidDate(d)) return null;

      const year = d.getUTCFullYear();
      const showYearWhen = prevYear === null || year !== prevYear;
      const label = formatMonthLabel(d.getUTCMonth(), year, useFullYear || showYearWhen);
      prevYear = year;
      return { index, label };
    })
    .filter((t): t is MonthTick => Boolean(t));
}


function parseMonthYearLabel(label: string): { month: string; year: string } | null {
  const m = /^([A-Za-z]{3})\s+(\d{4})$/.exec(label.trim());
  if (m) return { month: m[1]!, year: m[2]! };

  const m2 = /^([A-Za-z]{3})\s+[’'](\d{2})$/.exec(label.trim());
  if (m2) return { month: m2[1]!, year: `20${m2[2]!}` };

  return null;
}

function compactYearLabel(label: string): string {
  const parsed = parseMonthYearLabel(label);
  if (!parsed) return label;
  const yy = parsed.year.slice(-2);
  return `${parsed.month} ’${yy}`;
}

function dropYear(label: string): string {
  const parsed = parseMonthYearLabel(label);
  if (!parsed) return label;
  return parsed.month;
}

function estimateTextWidth(label: string, fontSize: number): number {
  // Heuristic width estimate in SVG user units:
  // average glyph width ~0.56em for typical UI sans fonts.
  return label.length * fontSize * 0.56;
}

function anchorExtents(width: number, anchor: "start" | "middle" | "end") {
  if (anchor === "start") return { left: 0, right: width };
  if (anchor === "end") return { left: width, right: 0 };
  return { left: width / 2, right: width / 2 };
}

function overlaps(a: { x: number; w: number; anchor: "start" | "middle" | "end" }, b: { x: number; w: number; anchor: "start" | "middle" | "end" }, padding: number) {
  const ea = anchorExtents(a.w, a.anchor);
  const eb = anchorExtents(b.w, b.anchor);
  return a.x + ea.right + padding > b.x - eb.left;
}

/**
 * Adjust x-axis month tick labels to avoid obvious overlaps.
 *
 * Strategy (in order):
 * 1) Compact any "Mon YYYY" label -> "Mon ’YY"
 * 2) If still overlapping, drop the year on the left label (e.g., "Dec" vs "Jan ’26")
 * 3) As a last resort, blank a non-edge label.
 *
 * This is intentionally heuristic (no DOM measurement) but works well with the
 * fixed-viewBox SVG charts used in npmtraffic.
 */
export function adjustMonthTicksForOverlap(
  ticks: MonthTick[],
  opts: { seriesLength: number; innerW: number; axisFontSize: number; padding?: number },
): MonthTick[] {
  const { seriesLength, innerW, axisFontSize } = opts;
  const padding = opts.padding ?? 8;

  if (ticks.length < 2 || seriesLength <= 1 || innerW <= 0) return ticks;

  // Clone to avoid mutating callers.
  const out = ticks.map((t) => ({ ...t }));

  const getX = (index: number) => innerW * (out[index]!.index / (seriesLength - 1));
  const getAnchor = (index: number): "start" | "middle" | "end" =>
    index === 0 ? "start" : index === out.length - 1 ? "end" : "middle";

  const widthAt = (index: number) => estimateTextWidth(out[index]!.label ?? "", axisFontSize);

  for (let i = 0; i < out.length - 1; i++) {
    // Skip if either label is already blank.
    if (!out[i]!.label || !out[i + 1]!.label) continue;

    const a = { x: getX(i), w: widthAt(i), anchor: getAnchor(i) };
    const b = { x: getX(i + 1), w: widthAt(i + 1), anchor: getAnchor(i + 1) };

    if (!overlaps(a, b, padding)) continue;

    // 1) Compact both labels (if they have years).
    out[i]!.label = compactYearLabel(out[i]!.label);
    out[i + 1]!.label = compactYearLabel(out[i + 1]!.label);

    const a1 = { x: a.x, w: widthAt(i), anchor: a.anchor };
    const b1 = { x: b.x, w: widthAt(i + 1), anchor: b.anchor };
    if (!overlaps(a1, b1, padding)) continue;

    // 2) Drop year on the left label (prefer keeping context on the right).
    out[i]!.label = dropYear(out[i]!.label);

    const a2 = { x: a.x, w: widthAt(i), anchor: a.anchor };
    const b2 = { x: b.x, w: widthAt(i + 1), anchor: b.anchor };
    if (!overlaps(a2, b2, padding)) continue;

    // 3) Last resort: blank the less-informative label.
    // - If the overlap happens right at the left edge, keep the later tick and blank the first label.
    // - Otherwise, prefer blanking a non-edge label to preserve context on the extremes.
    if (i === 0 && out.length >= 3) {
      out[i]!.label = "";
      continue;
    }
    if (i !== 0 && i !== out.length - 1) {
      out[i]!.label = "";
      continue;
    }
    if (i + 1 !== 0 && i + 1 !== out.length - 1) {
      out[i + 1]!.label = "";
    }
  }

  return out;
}
