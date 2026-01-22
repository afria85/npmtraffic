"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DerivedMetrics } from "@/lib/derived";
import type { TrafficSeriesRow } from "@/lib/traffic";
import { groupEventsByDate, loadEvents } from "@/lib/events";
import ActionMenu from "@/components/ui/ActionMenu";
import { computeLeftPad } from "@/components/charts/axis-padding";
import { buildMonthTicks } from "@/components/charts/time-ticks";

const CHART_BUTTON_CLASSES =
  "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold leading-none text-slate-100 transition hover:border-white/20 hover:bg-white/10";

type Point = { x: number; y: number };

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
  maStyle: LineStyleKey;
  showOutliers: boolean;
  outlierColor: PaletteKey;
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
  if (style === "dotted") return isMobile ? "1 9" : "1 6";
  return undefined;
}

function paletteValue(key: PaletteKey) {
  const item = PALETTE.find((p) => p.key === key) ?? PALETTE[0];
  return `var(${item.cssVar})`;
}

function safeParseSettings(input: string | null): Partial<ChartSettings> {
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
  const stylePanelRef = useRef<HTMLDivElement | null>(null);

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
        maStyle: "dashed",
        showOutliers: true,
        outlierColor: "amber",
      };
    }

    const saved = safeParseSettings(window.localStorage.getItem(settingsKey));
    return {
      showMA7: saved.showMA7 ?? true,
      showMA3: saved.showMA3 ?? false,
      downloadsColor: (saved.downloadsColor as PaletteKey) ?? "accent",
      ma7Color: (saved.ma7Color as PaletteKey) ?? "violet",
      ma3Color: (saved.ma3Color as PaletteKey) ?? "orange",
      downloadsStyle: (saved.downloadsStyle as LineStyleKey) ?? "solid",
      maStyle: (saved.maStyle as LineStyleKey) ?? "dashed",
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
  const axisFontSize = isMobile ? 12 : 11;
  const leftPad = useMemo(
    () => computeLeftPad(numberFormatter.format(maxValue), axisFontSize),
    [maxValue, axisFontSize]
  );
  const pad = { l: leftPad, r: 20, t: 16, b: isMobile ? 42 : 38 };
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
    return buildMonthTicks(series.map((row) => row.date), maxTicks);
  }, [isMobile, series]);

  const hovered = hoverIndex == null ? null : series[hoverIndex];
  const hoverPoint = hoverIndex == null ? null : downloadsPoints[hoverIndex] ?? null;

  const tooltipSide = hoverPoint && hoverPoint.x > pad.l + innerW * 0.6 ? "left" : "right";
  const tooltipV = hoverPoint && hoverPoint.y < pad.t + innerH * 0.35 ? "bottom" : "top";
  const tooltipDockClass =
    "pointer-events-none absolute w-[min(18rem,90%)] rounded-2xl border border-[color:var(--chart-tooltip-border)] bg-[color:var(--chart-tooltip-bg)] p-3 text-xs text-[color:var(--foreground)] shadow-sm shadow-black/20 backdrop-blur " +
    (tooltipSide === "left" ? "left-3" : "right-3") +
    " " +
    (tooltipV === "bottom" ? "bottom-3" : "top-3");
  const hoveredMA7 = hoverIndex == null ? null : derived?.ma7?.[hoverIndex]?.value ?? null;
  const hoveredMA3 = hoverIndex == null ? null : derived?.ma3?.[hoverIndex]?.value ?? null;
  const hoveredOutlier = hoverIndex == null ? null : derived?.outliers?.[hoverIndex] ?? null;
  const hoveredEvents = hovered ? eventsByDate.get(hovered.date) ?? [] : [];

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
    const rect = svg.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    setHoverIndex(pickClosestIndex(x, series.length));
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

  return (
    <section className="relative rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-semibold text-slate-200">Daily downloads ({days}d)</p>
        <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
          <label className="inline-flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={settings.showMA3}
              disabled={!canShowMA3}
              onChange={(event) => setSettings((prev) => ({ ...prev, showMA3: event.target.checked }))}
              className="h-4 w-4 accent-[color:var(--accent)]"
            />
            MA 3
          </label>
          <label className="inline-flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={settings.showMA7}
              disabled={!canShowMA7}
              onChange={(event) => setSettings((prev) => ({ ...prev, showMA7: event.target.checked }))}
              className="h-4 w-4 accent-[color:var(--accent)]"
            />
            MA 7
          </label>
        </div>
      </div>

      <div className="relative mt-3">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="h-60 w-full touch-pan-y sm:h-64"
          role="img"
          aria-label={`Daily downloads line chart (${days} days)`}
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(event) => {
            updateHoverIndexFromClientX(event.clientX, event.currentTarget);
          }}
          onTouchStart={(event) => {
            const touch = event.touches[0];
            if (!touch) return;
            updateHoverIndexFromClientX(touch.clientX, event.currentTarget);
          }}
          onTouchMove={(event) => {
            const touch = event.touches[0];
            if (!touch) return;
            updateHoverIndexFromClientX(touch.clientX, event.currentTarget);
          }}
          onTouchEnd={() => setHoverIndex(null)}
          onTouchCancel={() => setHoverIndex(null)}
        >
          {/* grid */}
          {yTicks.map((tick) => (
            <g key={tick.y}>
              <line x1={pad.l} x2={pad.l + innerW} y1={tick.y} y2={tick.y} stroke="var(--chart-grid)" />
              <text x={pad.l - 8} y={tick.y + 4} textAnchor="end" fontSize={axisFontSize} fill="var(--chart-axis)">
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
                <text x={textX} y={y + 20} textAnchor={textAnchor} fontSize={axisFontSize} fill="var(--chart-axis)">
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
              strokeDasharray={dashForStyle(settings.maStyle)}
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
              strokeDasharray={dashForStyle(settings.maStyle)}
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
            className="absolute right-3 top-3 z-20 w-[min(22rem,92vw)] rounded-2xl border border-[color:var(--chart-tooltip-border)] bg-[color:var(--chart-tooltip-bg)] p-3 text-xs text-[color:var(--foreground)] shadow-xl"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] uppercase tracking-[0.35em] text-[color:var(--muted)]">Chart style</div>
              <button
                type="button"
                className={CHART_BUTTON_CLASSES + " px-2 py-1"}
                onClick={() => setStyleOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[color:var(--muted)]">Downloads color</span>
                  <select
                    value={settings.downloadsColor}
                    onChange={(e) => setSettings((prev) => ({ ...prev, downloadsColor: e.target.value as PaletteKey }))}
                    className="rounded-xl border border-white/10 bg-[color:var(--surface)] px-2 py-1 text-sm text-[color:var(--foreground)]"
                  >
                    {PALETTE.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[color:var(--muted)]">Downloads line</span>
                  <select
                    value={settings.downloadsStyle}
                    onChange={(e) => setSettings((prev) => ({ ...prev, downloadsStyle: e.target.value as LineStyleKey }))}
                    className="rounded-xl border border-white/10 bg-[color:var(--surface)] px-2 py-1 text-sm text-[color:var(--foreground)]"
                  >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[color:var(--muted)]">MA 7 color</span>
                  <select
                    value={settings.ma7Color}
                    onChange={(e) => setSettings((prev) => ({ ...prev, ma7Color: e.target.value as PaletteKey }))}
                    className="rounded-xl border border-white/10 bg-[color:var(--surface)] px-2 py-1 text-sm text-[color:var(--foreground)]"
                  >
                    {PALETTE.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[color:var(--muted)]">MA 3 color</span>
                  <select
                    value={settings.ma3Color}
                    onChange={(e) => setSettings((prev) => ({ ...prev, ma3Color: e.target.value as PaletteKey }))}
                    className="rounded-xl border border-white/10 bg-[color:var(--surface)] px-2 py-1 text-sm text-[color:var(--foreground)]"
                  >
                    {PALETTE.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[color:var(--muted)]">MA line style</span>
                <select
                  value={settings.maStyle}
                  onChange={(e) => setSettings((prev) => ({ ...prev, maStyle: e.target.value as LineStyleKey }))}
                  className="rounded-xl border border-white/10 bg-[color:var(--surface)] px-2 py-1 text-sm text-[color:var(--foreground)]"
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </label>
            </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="inline-flex items-center gap-2 text-xs text-[color:var(--muted)]">
                  <input
                    type="checkbox"
                    checked={settings.showOutliers}
                    onChange={(e) => setSettings((prev) => ({ ...prev, showOutliers: e.target.checked }))}
                    className="h-4 w-4 accent-[color:var(--accent)]"
                  />
                  Outliers
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[color:var(--muted)]">Outlier color</span>
                  <select
                    value={settings.outlierColor}
                    onChange={(e) => setSettings((prev) => ({ ...prev, outlierColor: e.target.value as PaletteKey }))}
                    className="rounded-xl border border-white/10 bg-[color:var(--surface)] px-2 py-1 text-sm text-[color:var(--foreground)]"
                  >
                    {PALETTE.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
          </div>
        ) : null}

        {hovered ? (
          <div className={tooltipDockClass}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[color:var(--foreground)]">{hovered.date}</span>
              <span className="text-[color:var(--muted)]">UTC</span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[color:var(--muted)]">Downloads</span>
                <span className="font-mono">{numberFormatter.format(hovered.downloads)}</span>
              </div>
              {settings.showMA7 && typeof hoveredMA7 === "number" ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[color:var(--muted)]">MA 7</span>
                  <span className="font-mono">{hoveredMA7.toFixed(1)}</span>
                </div>
              ) : null}
              {settings.showMA3 && typeof hoveredMA3 === "number" ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[color:var(--muted)]">MA 3</span>
                  <span className="font-mono">{hoveredMA3.toFixed(1)}</span>
                </div>
              ) : null}
              {settings.showOutliers && hoveredOutlier?.is_outlier ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[color:var(--muted)]">Outlier score</span>
                  <span className="font-mono">{hoveredOutlier.score.toFixed(2)}</span>
                </div>
              ) : null}
            </div>
            {hoveredEvents.length ? (
              <div className="mt-2 border-t border-white/10 pt-2">
                <p className="text-[11px] uppercase tracking-[0.35em] text-[color:var(--muted)]">Events</p>
                <div className="mt-1 max-h-28 overflow-auto pr-1">
                  <ul className="space-y-1">
                  {hoveredEvents.slice(0, 3).map((evt) => (
                    <li key={`${evt.date_utc}|${evt.event_type}|${evt.label}`}>
                      <span className="text-[color:var(--muted)]">{evt.event_type}</span>: {evt.label}
                    </li>
                  ))}
                  {hoveredEvents.length > 3 ? <li className="text-[color:var(--muted)]">...</li> : null}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="mt-3 flex items-center justify-end gap-2">
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
