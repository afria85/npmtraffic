const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type MonthTick = { index: number; label: string };

type YearLabelMode = "always" | "first-or-change" | "never";

function parseDateParts(date: string) {
  const [y, m, d] = date.split("-").map((value) => Number(value));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (m < 1 || m > 12) return null;
  return { year: y, month: m, day: d };
}

export function formatMonthLabel(
  year: number,
  monthIndex: number,
  showYear: boolean,
  useFullYear: boolean
) {
  const month = MONTHS[monthIndex] ?? "";
  if (!showYear) return month;
  if (useFullYear) return `${month} ${year}`;
  const shortYear = String(year).slice(-2);
  return `${month} '${shortYear}`;
}

export function formatMonthLabelFromDate(date: string, useFullYear: boolean) {
  const parts = parseDateParts(date);
  if (!parts) return "";
  return formatMonthLabel(parts.year, parts.month - 1, true, useFullYear);
}

export function buildMonthTicks(
  dates: string[],
  maxTicks: number,
  yearMode: YearLabelMode,
  useFullYear: boolean
): MonthTick[] {
  if (!dates.length) return [];
  const monthStarts: { index: number; year: number; month: number }[] = [];
  let lastKey = "";

  dates.forEach((date, index) => {
    const parts = parseDateParts(date);
    if (!parts) return;
    const key = `${parts.year}-${parts.month}`;
    if (key === lastKey) return;
    monthStarts.push({ index, year: parts.year, month: parts.month });
    lastKey = key;
  });

  if (!monthStarts.length) return [];

  let selected = monthStarts;
  if (monthStarts.length > maxTicks) {
    const step = Math.ceil(monthStarts.length / maxTicks);
    selected = monthStarts.filter((_, idx) => idx % step === 0);
    const last = monthStarts[monthStarts.length - 1];
    if (selected[selected.length - 1]?.index !== last.index) {
      selected = [...selected, last];
    }
  }

  let lastYear: number | null = null;
  return selected.map((item, idx) => {
    const showYear =
      yearMode === "always" || (yearMode === "first-or-change" && (idx === 0 || lastYear !== item.year));
    lastYear = item.year;
    return {
      index: item.index,
      label: formatMonthLabel(item.year, item.month - 1, showYear, useFullYear),
    };
  });
}
