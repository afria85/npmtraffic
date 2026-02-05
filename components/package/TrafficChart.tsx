"use client";

import {useEffect, useLayoutEffect, useMemo, useRef, useState, useId} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { DerivedMetrics } from "@/lib/derived";
import type { TrafficSeriesRow } from "@/lib/traffic";
import { groupEventsByDate, loadEvents } from "@/lib/events";
import ActionMenu from "@/components/ui/ActionMenu";
import { IconChevronDown } from "@/components/ui/icons";
import { computeLeftPad } from "@/components/charts/axis-padding";
import { buildMonthTicks, adjustMonthTicksForOverlap } from "@/components/charts/time-ticks";
function MetricCheckbox({
  label,
  checked,
  disabled,
  title,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  title?: string;
  onChange: (next: boolean) => void;
}) {
  const slug = label.toLowerCase().replace(/\s+/g, "");
  const id = `metric-${slug}`;
  const name = slug;

  return (
    <label
      className={`inline-flex items-center gap-2 text-xs font-medium text-[var(--foreground-secondary)] select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      title={title}
    >
      <span className="relative inline-flex h-4 w-4 flex-none">
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer h-4 w-4 appearance-none rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30 checked:bg-[var(--accent)] checked:border-[var(--accent)]"
        />
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
        >
          <path
            d="M16.7 5.8 8.6 13.9 3.3 8.6"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{label}</span>
    </label>
  );
}

function ChartSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  const reactId = useId();
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const base = `chart-select-${slug || "select"}`;
  const id = `${base}-${reactId.replace(/[:]/g, "")}`;
  const name = base;

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[var(--foreground-tertiary)]">{label}</span>
      <div className="relative">
        <select
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 pr-10 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-tertiary)]" />
      </div>
    </label>
  );
}

const CHART_BUTTON_CLASSES = "inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold leading-none text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]";

type Point = { x: number; y: number };
type ChartEvent = { id?: string; label?: string; title?: string; type?: string };

type Props = {
  series: TrafficSeriesRow[];
  derived: DerivedMetrics;
  pkgName: string;
  days: number;
};

type PaletteKey = "accent" | "slate" | "blue" | "emerald" | "violet" | "amber" | "orange" | "pink" | "cyan";
type LineStyleKey = "solid" | "dashed" | "dotted";

type ChartSettings = {
  showMA7: boolean;
  showMA3: boolean;
  downloadsColor: PaletteKey;
  ma7Color: PaletteKey;
  ma3Color: PaletteKey;
  downloadsStyle: LineStyleKey;
  ma3Style: LineStyleKey;
  ma7Style: LineStyleKey;
  showOutliers: boolean;
  outlierColor: PaletteKey;
};

type LegacyChartSettings = ChartSettings & {
  maStyle?: LineStyleKey;
};

const numberFormatter = new Intl.NumberFormat("en-US");

const PALETTE: { key: PaletteKey; label: string; cssVar: string }[] = [
  { key: "accent", label: "Accent", cssVar: "--chart-palette-accent" },
  { key: "slate", label: "Slate", cssVar: "--chart-palette-slate" },
  { key: "blue", label: "Blue", cssVar: "--chart-palette-blue" },
  { key: "emerald", label: "Emerald", cssVar: "--chart-palette-emerald" },
  { key: "violet", label: "Violet", cssVar: "--chart-palette-violet" },
  { key: "amber", label: "Amber", cssVar: "--chart-palette-amber" },
  { key: "orange", label: "Orange", cssVar: "--chart-palette-orange" },
  { key: "pink", label: "Pink", cssVar: "--chart-palette-pink" },
  { key: "cyan", label: "Cyan", cssVar: "--chart-palette-cyan" },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toPath(points: Point[]) {
  if (!points.length) return "";
  const [first, ...rest] = points;
  return `M ${first.x.toFixed(2)} ${first.y.toFixed(2)} ${rest
    .map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ")}`;
}

function pickClosestIndex(x: number, count: number) {
  if (count <= 1) return 0;
  return clamp(Math.round(x * (count - 1)), 0, count - 1);
}

function dashFor(style: LineStyleKey, isMobile: boolean) {
  if (style === "dashed") return isMobile ? "14 8" : "10 6";
  // Slightly larger dot + spacing so dotted lines remain legible on high-DPI mobile screens.
  if (style === "dotted") return isMobile ? "2 10" : "2 8";
  return undefined;
}

function paletteValue(key: PaletteKey) {
  const item = PALETTE.find((p) => p.key === key) ?? PALETTE[0];
  return `var(${item.cssVar})`;
}

function safeParseSettings(input: string | null): Partial<LegacyChartSettings> {
  if (!input) return {};
  try {
    const parsed = JSON.parse(input) as Partial<ChartSettings>;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function readCssVar(name: string) {
  if (typeof window === "undefined") return "#0b0f14";
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || "#0b0f14";
}

function resolveCssVarsInSvg(xml: string) {
  if (typeof window === "undefined") return xml;
  const style = getComputedStyle(document.documentElement);
  const varRegex = /var\(--([a-zA-Z0-9-_]+)\)/g;
  const seen = new Set<string>();
  for (const m of xml.matchAll(varRegex)) {
    const name = m[1];
    if (name) seen.add(name);
  }
  if (seen.size === 0) return xml;
  let out = xml;
  for (const name of seen) {
    const value = style.getPropertyValue(`--${name}`).trim();
    if (!value) continue;
    out = out.split(`var(--${name})`).join(value);
  }
  return out;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function svgToBlob(svgEl: SVGSVGElement, background?: string) {
  const cloned = svgEl.cloneNode(true) as SVGSVGElement;
  cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (background) {
    const rect = svgEl.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", background);
    const first = cloned.firstChild;
    if (first) {
      cloned.insertBefore(rect, first);
    } else {
      cloned.appendChild(rect);
    }
  }
  const viewBox = cloned.getAttribute("viewBox") ?? "0 0 1000 260";
  const [, , w, h] = viewBox.split(" ").map((v) => Number(v));
  if (Number.isFinite(w) && Number.isFinite(h)) {
    cloned.setAttribute("width", String(w));
    cloned.setAttribute("height", String(h));
  }
  const xmlRaw = new XMLSerializer().serializeToString(cloned);
  const xml = resolveCssVarsInSvg(xmlRaw);
  return new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
}

async function svgToPngBlob(svgEl: SVGSVGElement, background: string) {
  const svgBlob = svgToBlob(svgEl);
  const svgText = await svgBlob.text();
  const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;

  const img = new Image();
  img.decoding = "async";

  const viewBox = svgEl.getAttribute("viewBox") ?? "0 0 1000 260";
  const [, , w, h] = viewBox.split(" ").map((v) => Number(v));
  const width = Number.isFinite(w) ? w : 1000;
  const height = Number.isFinite(h) ? h : 260;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to render SVG"));
    img.src = encoded;
  });

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  ctx.scale(scale, scale);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const pngBlob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/png"));
  return pngBlob;
}

export default function TrafficChart({ series, derived, pkgName, days }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const stylePanelRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const settingsKey = `npmtraffic_chart_settings:${pkgName}`;

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [styleOpen, setStyleOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [settings, setSettings] = useState<ChartSettings>(() => {
    if (typeof window === "undefined") {
      return {
        showMA7: true,
        showMA3: false,
        downloadsColor: "accent",
        ma7Color: "violet",
        ma3Color: "orange",
        downloadsStyle: "solid",
        ma3Style: "dashed",
        ma7Style: "dotted",
        showOutliers: true,
        outlierColor: "amber",
      };
    }

    const saved = safeParseSettings(window.localStorage.getItem(settingsKey));
    const legacyStyle = (saved.maStyle as LineStyleKey | undefined) ?? "dashed";
    const ma3Style = (saved.ma3Style as LineStyleKey) ?? "dashed";
    const ma7Style = (saved.ma7Style as LineStyleKey) ?? "dotted";

    return {
      showMA7: saved.showMA7 ?? true,
      showMA3: saved.showMA3 ?? false,
      downloadsColor: (saved.downloadsColor as PaletteKey) ?? "accent",
      ma7Color: (saved.ma7Color as PaletteKey) ?? "violet",
      ma3Color: (saved.ma3Color as PaletteKey) ?? "orange",
      downloadsStyle: (saved.downloadsStyle as LineStyleKey) ?? "solid",
      ma3Style: (saved.ma3Style as LineStyleKey) ?? ma3Style ?? legacyStyle,
      ma7Style: (saved.ma7Style as LineStyleKey) ?? ma7Style ?? legacyStyle,
      showOutliers: saved.showOutliers ?? true,
      outlierColor: (saved.outlierColor as PaletteKey) ?? "amber",
    };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, [settingsKey, settings]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mql.matches);
    update();

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", update);
      return () => mql.removeEventListener("change", update);
    }

    // Legacy Safari fallback (avoid eslint deprecation plugin dependency).
    const legacy = mql as unknown as {
      addListener?: (cb: () => void) => void;
      removeListener?: (cb: () => void) => void;
    };
    if (typeof legacy.addListener === "function") {
      legacy.addListener(update);
      return () => legacy.removeListener?.(update);
    }
    return;
  }, []);

  useEffect(() => {
    if (!styleOpen) return;
    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (stylePanelRef.current?.contains(target)) return;
      setStyleOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setStyleOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [styleOpen]);

  useEffect(() => {
    if (!isMobile || hoverIndex == null) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!chartContainerRef.current) return;
      if (chartContainerRef.current.contains(event.target as Node)) return;
      setHoverIndex(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [hoverIndex, isMobile]);

  const eventsByDate = useMemo(() => groupEventsByDate(loadEvents(pkgName)), [pkgName]);

  const maxValue = useMemo(() => {
    const downloads = series.map((row) => row.downloads);
    const ma7 = derived?.ma7?.map((v) => v?.value ?? null) ?? [];
    const ma3 = derived?.ma3?.map((v) => v?.value ?? null) ?? [];

    const candidateValues: number[] = [...downloads];
    for (const v of ma7) if (typeof v === "number" && Number.isFinite(v)) candidateValues.push(v);
    for (const v of ma3) if (typeof v === "number" && Number.isFinite(v)) candidateValues.push(v);

    return Math.max(1, ...candidateValues);
  }, [series, derived]);

  const width = 1000;
  const height = 260;
  const axisFontSize = isMobile ? 14 : 13;
  const yLabelOffset = isMobile ? 10 : 8;
  const leftPad = useMemo(() => computeLeftPad(numberFormatter.format(maxValue), axisFontSize), [maxValue, axisFontSize]);
  const pad = { l: leftPad, r: 20, t: 16, b: isMobile ? 48 : 40 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const { downloadsPoints, ma7Points, ma3Points } = useMemo(() => {
    const ma7 = derived?.ma7?.map((v) => v?.value ?? null) ?? [];
    const ma3 = derived?.ma3?.map((v) => v?.value ?? null) ?? [];

    const xFor = (i: number) => pad.l + innerW * (series.length <= 1 ? 0 : i / (series.length - 1));
    const yFor = (v: number) => pad.t + innerH * (1 - v / maxValue);

    const downloadsPoints = series.map((row, i) => ({ x: xFor(i), y: yFor(row.downloads) }));
    const ma7Points = series.map((_, i) => {
      const value = ma7[i];
      if (typeof value !== "number" || !Number.isFinite(value)) return null;
      return { x: xFor(i), y: yFor(value) };
    });
    const ma3Points = series.map((_, i) => {
      const value = ma3[i];
      if (typeof value !== "number" || !Number.isFinite(value)) return null;
      return { x: xFor(i), y: yFor(value) };
    });

    return { downloadsPoints, ma7Points, ma3Points };
  }, [series, derived, innerH, innerW, maxValue, pad.l, pad.t]);

  const downloadsPath = useMemo(() => toPath(downloadsPoints), [downloadsPoints]);
  const ma7Path = useMemo(() => toPath(ma7Points.filter(Boolean) as Point[]), [ma7Points]);
  const ma3Path = useMemo(() => toPath(ma3Points.filter(Boolean) as Point[]), [ma3Points]);

  const outlierPoints = useMemo(() => {
    const outliers = derived?.outliers ?? [];
    const pts: { index: number; x: number; y: number; score: number }[] = [];
    for (let i = 0; i < outliers.length; i += 1) {
      const o = outliers[i];
      if (!o || !o.is_outlier) continue;
      const p = downloadsPoints[i];
      if (!p) continue;
      pts.push({ index: i, x: p.x, y: p.y, score: o.score });
    }
    return pts;
  }, [derived, downloadsPoints]);

  const yTicks = useMemo(() => {
    const ticks = 4;
    const values: { y: number; label: string }[] = [];
    for (let i = 0; i <= ticks; i += 1) {
      const ratio = i / ticks;
      const value = Math.round(maxValue * (1 - ratio));
      const y = pad.t + innerH * ratio;
      values.push({ y, label: numberFormatter.format(value) });
    }
    return values;
  }, [maxValue, innerH, pad.t]);

  const xTicks = useMemo(() => {
    const maxTicks = isMobile ? 4 : 6;
    return adjustMonthTicksForOverlap(series.map((row) => row.date), buildMonthTicks(series.map((row) => row.date), maxTicks, "first-or-change", isMobile), { minIndexGap: isMobile ? 2 : 2 });
  }, [isMobile, series]);

  const hovered = hoverIndex == null ? null : series[hoverIndex];
  const hoverPoint = hoverIndex == null ? null : downloadsPoints[hoverIndex] ?? null;

  useLayoutEffect(() => {
    if (!hoverPoint || !svgRef.current || !chartContainerRef.current || !tooltipRef.current) {
      return;
    }
    const svgRect = svgRef.current.getBoundingClientRect();
    const containerRect = chartContainerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scaleX = svgRect.width / width;
    const scaleY = svgRect.height / height;
    const pointX = svgRect.left - containerRect.left + hoverPoint.x * scaleX;
    const pointY = svgRect.top - containerRect.top + hoverPoint.y * scaleY;
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    const tooltipWidth = tooltipRect.width;
    const tooltipHeight = tooltipRect.height;
    const gap = 8;
    const crosshairBuffer = 6;
    const pointerLeft = pointX - crosshairBuffer;
    const pointerRight = pointX + crosshairBuffer;
    const candidates = [
      { left: pointX + gap, top: pointY - tooltipHeight - gap },
      { left: pointX + gap, top: pointY + gap },
      { left: pointX - tooltipWidth - gap, top: pointY - tooltipHeight - gap },
      { left: pointX - tooltipWidth - gap, top: pointY + gap },
    ];

    const fitsCandidate = candidates.find((candidate) => {
      if (candidate.left < 0 || candidate.top < 0) return false;
      if (candidate.left + tooltipWidth > containerWidth) return false;
      if (candidate.top + tooltipHeight > containerHeight) return false;
      return candidate.left >= pointerRight || candidate.left + tooltipWidth <= pointerLeft;
    });

    let finalLeft: number;
    let finalTop: number;
    if (fitsCandidate) {
      finalLeft = fitsCandidate.left;
      finalTop = fitsCandidate.top;
    } else {
      const preferRight = pointX > containerWidth / 2;
      let fallbackLeft = preferRight ? pointX + gap : pointX - tooltipWidth - gap;
      fallbackLeft = Math.min(Math.max(fallbackLeft, 0), containerWidth - tooltipWidth);
      const oppositeLeft = preferRight ? pointX - tooltipWidth - gap : pointX + gap;
      if (
        !(fallbackLeft >= pointerRight || fallbackLeft + tooltipWidth <= pointerLeft) &&
        oppositeLeft >= 0 &&
        oppositeLeft + tooltipWidth <= containerWidth
      ) {
        fallbackLeft = oppositeLeft;
      }
      let fallbackTop = pointY - tooltipHeight - gap;
      if (fallbackTop < 0 || fallbackTop + tooltipHeight > containerHeight) {
        fallbackTop = Math.min(Math.max(pointY + gap, 0), containerHeight - tooltipHeight);
      }
      finalLeft = fallbackLeft;
      finalTop = fallbackTop;
    }
    tooltipRef.current.style.left = `${finalLeft}px`;
    tooltipRef.current.style.top = `${finalTop}px`;
  }, [hoverPoint, width, height, isMobile]);

  const tooltipClassName =
    "absolute z-30 pointer-events-none rounded-2xl border border-[color:var(--chart-tooltip-border)] bg-[color:var(--chart-tooltip-bg)] p-3 text-xs text-[var(--foreground)] shadow-sm shadow-black/20 backdrop-blur transition duration-150";
  const hoveredMA7 = hoverIndex == null ? null : derived?.ma7?.[hoverIndex]?.value ?? null;
  const hoveredMA3 = hoverIndex == null ? null : derived?.ma3?.[hoverIndex]?.value ?? null;
  const hoveredOutlier = hoverIndex == null ? null : derived?.outliers?.[hoverIndex] ?? null;
  const hoveredEvents: ChartEvent[] = hovered
    ? (((eventsByDate.get(hovered.date) as ChartEvent[] | undefined) ?? []) as ChartEvent[])
    : [];

  const canShowMA7 = Boolean(ma7Path);
  const canShowMA3 = Boolean(ma3Path);

  const dashForStyle = (style: LineStyleKey) => dashFor(style, isMobile);

  const downloadsStrokeWidth = isMobile ? 3.0 : 2.25;
  const ma7StrokeWidth = isMobile ? 2.6 : 1.8;
  const ma3StrokeWidth = isMobile ? 2.4 : 1.6;
  const outlierRadius = isMobile ? 5.2 : 4.6;
  const outlierStrokeWidth = isMobile ? 2.4 : 2;
  const hoverRadius = isMobile ? 6 : 4.5;
  const crosshairStrokeWidth = isMobile ? 2.8 : 1.6;

  const updateHoverIndexFromClientX = (clientX: number, svg: SVGSVGElement) => {
    // Use the SVG CTM when available so the crosshair stays precisely under the cursor
    // across responsive scaling, device pixel ratios, and browser zoom.
    let viewX: number | null = null;
    try {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = 0;
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const local = pt.matrixTransform(ctm.inverse());
        viewX = local.x;
      }
    } catch {
      viewX = null;
    }
    if (viewX == null) {
      const rect = svg.getBoundingClientRect();
      viewX = ((clientX - rect.left) / rect.width) * width;
    }
    const clampedX = clamp(viewX, 0, width);
    const normalized = clamp((clampedX - pad.l) / innerW, 0, 1);
    setHoverIndex(pickClosestIndex(normalized, series.length));
  };

  const handlePointerEvent = (event: ReactPointerEvent<SVGSVGElement>) => {
    const svg = event.currentTarget as SVGSVGElement;
    updateHoverIndexFromClientX(event.clientX, svg);
  };

  const eventMarkerRadius = isMobile ? 5 : 4;

  const exports = useMemo(
    () => [
      {
        key: "svg",
        label: "Export SVG",
        onClick: () => {
          const svg = svgRef.current;
          if (!svg) return;
          const bg = readCssVar("--surface");
          const blob = svgToBlob(svg, bg);
          downloadBlob(blob, `${pkgName}-traffic.svg`);
        },
      },
      {
        key: "png",
        label: "Export PNG",
        onClick: async () => {
          const svg = svgRef.current;
          if (!svg) return;
          const bg = readCssVar("--surface");
          const blob = await svgToPngBlob(svg, bg);
          downloadBlob(blob, `${pkgName}-traffic.png`);
        },
      },
    ],
    [pkgName]
  );

  const headerRowClass = "flex w-full min-w-0 flex-wrap items-center justify-between gap-2 sm:gap-3";
  const toggleGroupClass = "ml-auto flex items-center justify-end gap-2 sm:gap-3";

  return (
    <section className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
      <div className={headerRowClass}>
        <p className="text-sm font-semibold text-[var(--foreground-secondary)]">Daily downloads ({days}d)</p>
        <div className={toggleGroupClass}>
          <MetricCheckbox label="MA 3" checked={settings.showMA3} disabled={!canShowMA3} onChange={(next) => setSettings((prev) => ({ ...prev, showMA3: next }))} title="3-day moving average" />

          <MetricCheckbox label="MA 7" checked={settings.showMA7} disabled={!canShowMA7} onChange={(next) => setSettings((prev) => ({ ...prev, showMA7: next }))} title="7-day moving average" />
        </div>
      </div>

            {/*
        Chart layout contract:
        - Legend must never overlay the plot (avoid covering data/tooltip).
        - Legend sits below the plot to keep the chart wide on tablet/mobile.
      */}
      <div ref={chartContainerRef} className="relative mt-3 min-w-0">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="h-60 w-full touch-pan-y sm:h-64"
            role="img"
            aria-label={`Daily downloads line chart (${days} days)`}
            onMouseLeave={() => setHoverIndex(null)}
            onPointerDown={handlePointerEvent}
            onPointerMove={handlePointerEvent}
            onPointerLeave={() => setHoverIndex(null)}
          >
            {/* grid */}
            {yTicks.map((tick) => (
              <g key={tick.y}>
                <line x1={pad.l} x2={pad.l + innerW} y1={tick.y} y2={tick.y} stroke="var(--chart-grid)" />
                <text
                  x={pad.l - yLabelOffset}
                  y={tick.y + 4}
                  textAnchor="end"
                  fontSize={axisFontSize}
                  fill="var(--chart-axis)"
                >
                  {tick.label}
                </text>
              </g>
            ))}

            {xTicks.map((tick, idx) => {
              const x = pad.l + innerW * (series.length <= 1 ? 0 : tick.index / (series.length - 1));
              const y = pad.t + innerH;
              const isFirst = idx === 0;
              const isLast = idx === xTicks.length - 1;
              const textAnchor = isFirst ? "start" : isLast ? "end" : "middle";
              const textX = isFirst ? x + 2 : isLast ? x - 2 : x;
              return (
                <g key={`x-${tick.index}`}>
                  <line x1={x} x2={x} y1={y} y2={y + 6} stroke="var(--chart-grid)" />
                  <text x={textX} y={y + 24} textAnchor={textAnchor} fontSize={axisFontSize} fill="var(--chart-axis)">
                    {tick.label}
                  </text>
                </g>
              );
            })}

            {/* event markers */}
            {series.map((row, index) => {
              const dayEvents = eventsByDate.get(row.date);
              if (!dayEvents?.length) return null;
              const x = downloadsPoints[index]?.x ?? null;
              if (x == null) return null;
              return (
                <g key={`evt-${row.date}`}>
                  <line x1={x} x2={x} y1={pad.t} y2={pad.t + innerH} stroke="var(--chart-palette-accent)" opacity={0.14} />
                  <circle cx={x} cy={pad.t + 6} r={eventMarkerRadius} fill="var(--chart-palette-accent)" opacity={0.45} />
                </g>
              );
            })}

            {/* outlier markers */}
            {settings.showOutliers && outlierPoints.length ? (
              <g>
                {outlierPoints.map((p) => (
                  <circle
                    key={`out-${p.index}`}
                    cx={p.x}
                    cy={p.y}
                    r={outlierRadius}
                    fill={paletteValue(settings.outlierColor)}
                    opacity={0.82}
                    stroke="var(--background)"
                    strokeWidth={outlierStrokeWidth}
                  />
                ))}
              </g>
            ) : null}

            {/* downloads */}
            <path
              d={downloadsPath}
              fill="none"
              stroke={paletteValue(settings.downloadsColor)}
              strokeWidth={downloadsStrokeWidth}
              strokeDasharray={dashForStyle(settings.downloadsStyle)}
              strokeLinecap="round"
            />

            {/* MA lines */}
            {settings.showMA7 && canShowMA7 ? (
              <path
                d={ma7Path}
                fill="none"
                stroke={paletteValue(settings.ma7Color)}
                strokeWidth={ma7StrokeWidth}
                strokeDasharray={dashForStyle(settings.ma7Style)}
                strokeLinecap="round"
                opacity={0.92}
              />
            ) : null}

            {settings.showMA3 && canShowMA3 ? (
              <path
                d={ma3Path}
                fill="none"
                stroke={paletteValue(settings.ma3Color)}
                strokeWidth={ma3StrokeWidth}
                strokeDasharray={dashForStyle(settings.ma3Style)}
                strokeLinecap="round"
                opacity={0.88}
              />
            ) : null}

            {/* hover */}
            {hoverIndex != null ? (
              <g>
                <line
                  x1={downloadsPoints[hoverIndex].x}
                  x2={downloadsPoints[hoverIndex].x}
                  y1={pad.t}
                  y2={pad.t + innerH}
                  stroke="var(--chart-grid)"
                  strokeWidth={crosshairStrokeWidth}
                />
                <circle
                  cx={downloadsPoints[hoverIndex].x}
                  cy={downloadsPoints[hoverIndex].y}
                  r={hoverRadius}
                  fill={paletteValue(settings.downloadsColor)}
                />
              </g>
            ) : null}
          </svg>

          {styleOpen ? (
            <div
              ref={stylePanelRef}
              className="absolute right-3 top-3 z-20 w-[min(22rem,92vw)] rounded-2xl border border-[color:var(--chart-tooltip-border)] bg-[color:var(--chart-tooltip-bg)] p-3 text-xs text-[var(--foreground)] shadow-xl"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] uppercase tracking-[0.35em] text-[var(--foreground-tertiary)]">Chart style</div>
                <button
                  type="button"
                  className={CHART_BUTTON_CLASSES + " px-2 py-1"}
                  onClick={() => setStyleOpen(false)}
                >
                  Close
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <ChartSelect
                  label="Downloads color"
                  value={settings.downloadsColor}
                  onChange={(value) => setSettings((prev) => ({ ...prev, downloadsColor: value as PaletteKey }))}
                  options={PALETTE.map((p) => ({ label: p.label, value: p.key }))}
                />

                <ChartSelect
                  label="Downloads line"
                  value={settings.downloadsStyle}
                  onChange={(value) => setSettings((prev) => ({ ...prev, downloadsStyle: value as LineStyleKey }))}
                  options={[
                    { label: "Solid", value: "solid" },
                    { label: "Dashed", value: "dashed" },
                    { label: "Dotted", value: "dotted" },
                  ]}
                />

                <ChartSelect
                  label="MA 3 color"
                  value={settings.ma3Color}
                  onChange={(value) => setSettings((prev) => ({ ...prev, ma3Color: value as PaletteKey }))}
                  options={PALETTE.map((p) => ({ label: p.label, value: p.key }))}
                />

                <ChartSelect
                  label="MA 3 line style"
                  value={settings.ma3Style}
                  onChange={(value) => setSettings((prev) => ({ ...prev, ma3Style: value as LineStyleKey }))}
                  options={[
                    { label: "Solid", value: "solid" },
                    { label: "Dashed", value: "dashed" },
                    { label: "Dotted", value: "dotted" },
                  ]}
                />

                <ChartSelect
                  label="MA 7 color"
                  value={settings.ma7Color}
                  onChange={(value) => setSettings((prev) => ({ ...prev, ma7Color: value as PaletteKey }))}
                  options={PALETTE.map((p) => ({ label: p.label, value: p.key }))}
                />

                <ChartSelect
                  label="MA 7 line style"
                  value={settings.ma7Style}
                  onChange={(value) => setSettings((prev) => ({ ...prev, ma7Style: value as LineStyleKey }))}
                  options={[
                    { label: "Solid", value: "solid" },
                    { label: "Dashed", value: "dashed" },
                    { label: "Dotted", value: "dotted" },
                  ]}
                />

                <div className="col-span-2">
                  <MetricCheckbox
                    label="Outliers"
                    checked={settings.showOutliers}
                    onChange={(next) => setSettings((prev) => ({ ...prev, showOutliers: next }))}
                  />
                </div>

                <ChartSelect
                  label="Outlier color"
                  value={settings.outlierColor}
                  onChange={(value) => setSettings((prev) => ({ ...prev, outlierColor: value as PaletteKey }))}
                  options={PALETTE.map((p) => ({ label: p.label, value: p.key }))}
                />
              </div>
            </div>
          ) : null}

          {hovered ? (
            <div ref={tooltipRef} className={tooltipClassName}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[var(--foreground)]">{hovered.date}</span>
                <span className="text-[var(--foreground-tertiary)]">UTC</span>
              </div>

              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--foreground-tertiary)]">Downloads</span>
                  <span className="font-mono">{numberFormatter.format(hovered.downloads)}</span>
                </div>

                {settings.showMA3 && typeof hoveredMA3 === "number" ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[var(--foreground-tertiary)]">MA 3</span>
                    <span className="font-mono">{hoveredMA3.toFixed(1)}</span>
                  </div>
                ) : null}

                {settings.showMA7 && typeof hoveredMA7 === "number" ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[var(--foreground-tertiary)]">MA 7</span>
                    <span className="font-mono">{hoveredMA7.toFixed(1)}</span>
                  </div>
                ) : null}

                {settings.showOutliers && hoveredOutlier?.is_outlier ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[var(--foreground-tertiary)]">Outlier</span>
                    <span className="font-mono">{Number(hoveredOutlier.score).toFixed(2)}</span>
                  </div>
                ) : null}

                {hoveredEvents.length ? (
                  <div className="pt-1">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--foreground-tertiary)]">Events</div>
                    <ul className="mt-1 space-y-0.5">
                      {hoveredEvents.slice(0, 3).map((e, i) => (
                        <li key={e.id ?? `${hovered.date}-${i}`} className="truncate text-[var(--foreground)]">
                          {e.label ?? e.title ?? e.type ?? "Event"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        {/* Legend (visual mapping). Never overlays the plot. */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[11px] text-[var(--foreground)] shadow-lg max-w-full">
          <ul className="space-y-1">
            <li className="flex items-center gap-2">
              <svg width="32" height="8" viewBox="0 0 32 8" aria-hidden>
                <line
                  x1="1"
                  y1="4"
                  x2="31"
                  y2="4"
                  stroke={paletteValue(settings.downloadsColor)}
                  strokeWidth={downloadsStrokeWidth}
                  strokeDasharray={dashForStyle(settings.downloadsStyle)}
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-[var(--foreground-tertiary)]">Downloads</span>
            </li>

            {settings.showMA3 && canShowMA3 ? (
              <li className="flex items-center gap-2">
                <svg width="32" height="8" viewBox="0 0 32 8" aria-hidden>
                  <line
                    x1="1"
                    y1="4"
                    x2="31"
                    y2="4"
                    stroke={paletteValue(settings.ma3Color)}
                    strokeWidth={ma3StrokeWidth}
                    strokeDasharray={dashForStyle(settings.ma3Style)}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-[var(--foreground-tertiary)]">MA 3</span>
              </li>
            ) : null}

            {settings.showMA7 && canShowMA7 ? (
              <li className="flex items-center gap-2">
                <svg width="32" height="8" viewBox="0 0 32 8" aria-hidden>
                  <line
                    x1="1"
                    y1="4"
                    x2="31"
                    y2="4"
                    stroke={paletteValue(settings.ma7Color)}
                    strokeWidth={ma7StrokeWidth}
                    strokeDasharray={dashForStyle(settings.ma7Style)}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-[var(--foreground-tertiary)]">MA 7</span>
              </li>
            ) : null}

            {settings.showOutliers && outlierPoints.length ? (
              <li className="flex items-center gap-2">
                <svg width="32" height="8" viewBox="0 0 32 8" aria-hidden>
                  <circle cx="16" cy="4" r="3" fill={paletteValue(settings.outlierColor)} opacity="0.85" />
                </svg>
                <span className="text-[var(--foreground-tertiary)]">Outliers</span>
              </li>
            ) : null}
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
          type="button"
          className={CHART_BUTTON_CLASSES}
          onClick={() => setStyleOpen((v) => !v)}
          aria-expanded={styleOpen}
        >
          Style
        </button>
          <ActionMenu label="Export" items={exports} buttonClassName={CHART_BUTTON_CLASSES} />
        </div>
      </div>

    </section>
  );
}
