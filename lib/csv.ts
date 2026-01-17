function escapeCsvValue(value: string | number | null | undefined) {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/"/g, "\"\"")}"`;
  }
  return str;
}

export function buildCsv(
  rows: Array<Array<string | number | null | undefined>>,
  delimiter = ","
) {
  return rows.map((row) => row.map(escapeCsvValue).join(delimiter)).join("\n");
}
