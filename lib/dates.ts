export function toYYYYMMDD(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysAgoUTC(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map((segment) => Number(segment));
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

export function listDatesBetween(start: string, end: string): string[] {
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return [];
  }
  const result: string[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    result.push(toYYYYMMDD(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}
