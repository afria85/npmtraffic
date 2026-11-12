function escapeCsvValue(
  value: string | number | null | undefined,
  opts: { delimiter?: string; excelSafe?: boolean } = {}
) {
  if (value == null) return "";
  const isNumeric = typeof value === "number";
  let str = String(value);
  const delimiter = opts.delimiter ?? ",";

  // Some spreadsheet importers skip leading whitespace before recognizing a formula.
  if (!isNumeric && /^(?:[\t\r\n]|\s*[=+\-@|%])/.test(str)) {
    if (opts.excelSafe) {
      // Excel-friendly export: prefix with a single quote to force literal interpretation.
      // Escape any existing single quotes to keep the cell content stable.
      str = `'${str.replace(/'/g, "''")}`;
    } else {
      str = `'${str}`;
    }
  }
  if (str.includes(delimiter) || str.includes("\"") || str.includes("\n") || str.includes("\r")) {
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
    .map((row) => row.map((cell) => escapeCsvValue(cell, { ...opts, delimiter })).join(delimiter))
    .join("\n");
}
