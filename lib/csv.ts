function escapeCsvValue(
  value: string | number | null | undefined,
  opts: { excelSafe?: boolean } = {}
) {
  if (value == null) return "";
  let str = String(value);

  // Mitigate CSV/Excel formula injection for Excel-friendly exports.
  // If a cell begins with one of the characters below, Excel may interpret it
  // as a formula when opening CSV.
  if (opts.excelSafe && /^[=+\-@|%]/.test(str)) {
    // Prefix with a single quote to force literal interpretation in Excel.
    // Also escape any existing single quotes to keep the cell content stable.
    str = `'${str.replace(/'/g, "''")}`;
  }
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/"/g, "\"\"")}"`;
  }
  return str;
}

export function buildCsv(
  rows: Array<Array<string | number | null | undefined>>,
  delimiter = ",",
  opts: { excelSafe?: boolean } = {}
) {
  return rows
    .map((row) => row.map((cell) => escapeCsvValue(cell, opts)).join(delimiter))
    .join("\n");
}
