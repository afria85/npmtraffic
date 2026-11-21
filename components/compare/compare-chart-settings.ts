/** Client chart presentation only; does not alter downloaded data or exports. */
export type PaletteKey =
  | "accent" | "slate" | "blue" | "emerald" | "violet"
  | "amber" | "orange" | "pink" | "cyan";
export type LineStyleKey = "solid" | "dashed" | "dotted";

export type CompareChartSettings = {
  lineStyles: Record<string, LineStyleKey>;
  colors: Record<string, PaletteKey>;
  /** Explicit choices must survive navigation, even if a user intentionally repeats a color. */
  customColors?: string[];
};

// Five semantically separate choices; omit cyan because it duplicates accent in dark mode.
const DEFAULT_COLOR_ORDER: PaletteKey[] = [
  "accent", "amber", "pink", "blue", "emerald", "violet", "orange", "slate",
];

const LINE_STYLE_ORDER: LineStyleKey[] = ["solid", "dashed", "dotted"];
const ALL_COLORS = new Set<PaletteKey>([
  "accent", "slate", "blue", "emerald", "violet", "amber", "orange", "pink", "cyan",
]);
const ALL_LINES = new Set<LineStyleKey>(LINE_STYLE_ORDER);

function validColor(value: unknown): value is PaletteKey {
  return typeof value === "string" && ALL_COLORS.has(value as PaletteKey);
}
function validLineStyle(value: unknown): value is LineStyleKey {
  return typeof value === "string" && ALL_LINES.has(value as LineStyleKey);
}

export function defaultCompareColors(names: string[]): Record<string, PaletteKey> {
  return Object.fromEntries(names.map((name, index) => [
    name,
    DEFAULT_COLOR_ORDER[index % DEFAULT_COLOR_ORDER.length],
  ]));
}

/**
 * Old sessions could persist a partial map after adding packages, making every
 * new line fall back to slate. Reconcile legacy colors without destroying
 * explicit user-picked colors tagged by the current style picker.
 */
export function hydrateCompareChartSettings(
  names: string[],
  stored: Partial<CompareChartSettings> = {},
): CompareChartSettings {
  const savedColors = stored.colors && typeof stored.colors === "object" ? stored.colors : {};
  const savedLines = stored.lineStyles && typeof stored.lineStyles === "object" ? stored.lineStyles : {};
  const manual = new Set(
    Array.isArray(stored.customColors)
      ? stored.customColors.filter((name): name is string => typeof name === "string" && names.includes(name))
      : [],
  );
  const defaults = defaultCompareColors(names);
  const colors: Record<string, PaletteKey> = {};
  const used = new Set<PaletteKey>();

  // Explicit selections win. The user may deliberately choose matching colors.
  for (const name of names) {
    if (manual.has(name) && validColor(savedColors[name])) {
      colors[name] = savedColors[name];
      used.add(savedColors[name]);
    }
  }

  for (const name of names) {
    if (colors[name]) continue;
    const saved = savedColors[name];
    const preferred = validColor(saved) ? saved : defaults[name];
    const chosen = !used.has(preferred)
      ? preferred
      : DEFAULT_COLOR_ORDER.find((color) => !used.has(color)) ?? preferred;
    colors[name] = chosen;
    used.add(chosen);
  }

  const lineStyles = Object.fromEntries(names.map((name, index) => [
    name,
    validLineStyle(savedLines[name]) ? savedLines[name] : LINE_STYLE_ORDER[index % LINE_STYLE_ORDER.length],
  ])) as Record<string, LineStyleKey>;

  return { colors, lineStyles, customColors: [...manual] };
}
