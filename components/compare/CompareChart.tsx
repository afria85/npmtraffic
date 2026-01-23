"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import ActionMenu from "@/components/ui/ActionMenu";
import { computeLeftPad } from "@/components/charts/axis-padding";
import { buildMonthTicks } from "@/components/charts/time-ticks";

const CHART_BUTTON_CLASSES =
  "inline-flex items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-xs font-semibold leading-none text-[color:var(--foreground)] transition hover:bg-[color:var(--surface-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";

type CompareSeriesRow = {
  date: string;
  values: Record<string, { downloads: number; delta: number | null }>;
};

type Props = {
  series: CompareSeriesRow[];
  packageNames: string[];
  days?: number;
};

type Point = { x: number; y: number };

type PaletteKey = "accent" | "slate" | "blue" | "emerald" | "violet" | "amber" | "orange" | "pink" | "cyan";
type LineStyleKey = "solid" | "dashed" | "dotted";

type CompareChartSettings = {
  lineStyles: Record<string, LineStyleKey>;
  colors: Record<string, PaletteKey>;
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

const WIDTH = 1000;
const HEIGHT = 260;

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

function safeParseSettings(input: string | null): Partial<CompareChartSettings> {
  if (!input) return {};
  try {
    const parsed = JSON.parse(input) as Partial<CompareChartSettings>;
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
  const seen = new Set<string>();
  const matches = xml.match(/var\(--[a-zA-Z0-9-_]+\)/g) ?? [];
  for (const token of matches) {
    if (seen.has(token)) continue;
    seen.add(token);
    const name = token.slice(4, -1); // --var-name
    const v = style.getPropertyValue(name).trim();
    if (!v) continue;
    xml = xml.split(token).join(v);
  }
  return xml;
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

  const pngBlob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png")
  );
  return pngBlob;
}

function buildDefaultColors(packageNames: string[]) {
  const order: PaletteKey[] = ["accent", "amber", "pink", "blue", "emerald", "violet", "cyan", "orange", "slate"];
  const colors: Record<string, PaletteKey> = {};
  packageNames.forEach((pkg, idx) => {
    colors[pkg] = order[idx] ?? "slate";
  });
  return colors;
}

function buildDefaultLineStyles(packageNames: string[]) {
  const styles: Record<string, LineStyleKey> = {};
  packageNames.forEach((pkg) => {
    styles[pkg] = "solid";
  });
  return styles;
}

export default function CompareChart({ series, packageNames, days }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const stylePanelRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const settingsKey = `npmtraffic_chart_settings:compare:${packageNames.join("|")}`;

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [styleOpen, setStyleOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [settings, setSettings] = useState<CompareChartSettings>(() => {
    if (typeof window === "undefined") {
      return { lineStyles: buildDefaultLineStyles(packageNames), colors: buildDefaultColors(packageNames) };
    }
    const saved = safeParseSettings(window.localStorage.getItem(settingsKey));
    return {
      lineStyles: { ...buildDefaultLineStyles(packageNames), ...(saved.lineStyles ?? {}) },
      colors: { ...buildDefaultColors(packageNames), ...(saved.colors ?? {}) },
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setStyleOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
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


  const maxValue = useMemo(() => {
    const values: number[] = [];
    for (const row of series) {
      for (const pkg of packageNames) {
        const v = row.values[pkg]?.downloads;
        if (typeof v === "number" && Number.isFinite(v)) values.push(v);
      }
    }
    return Math.max(1, ...values);
  }, [series, packageNames]);

  const axisFontSize = isMobile ? 13 : 11;
  const yLabelOffset = isMobile ? 10 : 8;
  const leftPad = useMemo(
    () => computeLeftPad(numberFormatter.format(maxValue), axisFontSize),
    [maxValue, axisFontSize]
  );
  const pad = { l: leftPad, r: 20, t: 16, b: isMobile ? 48 : 40 };
  const innerW = WIDTH - pad.l - pad.r;
  const innerH = HEIGHT - pad.t - pad.b;

  const pointsByPkg = useMemo(() => {
    const xFor = (i: number) => pad.l + innerW * (series.length <= 1 ? 0 : i / (series.length - 1));
    const yFor = (v: number) => pad.t + innerH * (1 - v / maxValue);

    const pointsByPkg = new Map<string, Point[]>();
    for (const pkg of packageNames) {
      pointsByPkg.set(
        pkg,
        series.map((row, i) => ({ x: xFor(i), y: yFor(row.values[pkg]?.downloads ?? 0) }))
      );
    }
    return pointsByPkg;
  }, [innerH, innerW, maxValue, packageNames, pad.l, pad.t, series]);

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
    const yearMode = isMobile ? "always" : "first-or-change";
    return buildMonthTicks(series.map((row) => row.date), maxTicks, yearMode, true);
  }, [isMobile, series]);

  const hovered = hoverIndex == null ? null : series[hoverIndex];

  const primaryPoints = pointsByPkg.get(packageNames[0] ?? "") ?? [];
  const hoverPoint = hoverIndex == null ? null : primaryPoints[hoverIndex] ?? null;

  useLayoutEffect(() => {
    if (!hoverPoint || !svgRef.current || !chartContainerRef.current || !tooltipRef.current) {
      return;
    }
    const svgRect = svgRef.current.getBoundingClientRect();
    const containerRect = chartContainerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scaleX = svgRect.width / WIDTH;
    const scaleY = svgRect.height / HEIGHT;
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
  }, [hoverPoint, isMobile]);

  const tooltipClassName =
    "absolute z-30 pointer-events-none rounded-2xl border border-[color:var(--chart-tooltip-border)] bg-[color:var(--chart-tooltip-bg)] p-3 text-xs text-[color:var(--foreground)] shadow-sm shadow-black/20 backdrop-blur transition duration-150";

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
          downloadBlob(blob, `compare-${packageNames.length}-packages.svg`);
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
          downloadBlob(blob, `compare-${packageNames.length}-packages.png`);
        },
      },
    ],
    [packageNames.length]
  );

  const clientPointToSvgX = (clientX: number, clientY: number, svg: SVGSVGElement) => {
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgPt = pt.matrixTransform(ctm.inverse());
    return svgPt.x;
  };

  const updateHoverIndexFromClientPoint = (clientX: number, clientY: number, svg: SVGSVGElement) => {
    const svgX = clientPointToSvgX(clientX, clientY, svg);
    if (svgX == null) return;
    const viewX = clamp(svgX, 0, WIDTH);
    const normalized = clamp((viewX - pad.l) / innerW, 0, 1);
    // Keep this math aligned with pointsByPkg so the crosshair follows the cursor precisely.
    setHoverIndex(pickClosestIndex(normalized, series.length));
  };

  const handlePointerEvent = (event: ReactPointerEvent<SVGSVGElement>) => {
    const svg = event.currentTarget as SVGSVGElement;
    updateHoverIndexFromClientPoint(event.clientX, event.clientY, svg);
  };

  return (
    <section className="relative rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-200">
          Daily downloads ({days ? `${days}d` : "range"})
        </p>
      </div>

      <div ref={chartContainerRef} className="relative mt-4">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-64 w-full touch-pan-y"
          role="img"
          aria-label={`Compare daily downloads line chart${days ? ` (${days} days)` : ""}`}
          onMouseLeave={() => setHoverIndex(null)}
          onPointerDown={handlePointerEvent}
          onPointerMove={handlePointerEvent}
          onPointerLeave={() => setHoverIndex(null)}
          onPointerCancel={() => setHoverIndex(null)}
        >
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

          {packageNames.map((pkg) => {
            const points = pointsByPkg.get(pkg) ?? [];
            const path = toPath(points);
            if (!path) return null;
            const color = paletteValue(settings.colors[pkg] ?? "slate");
            const style = settings.lineStyles[pkg] ?? "solid";
            return (
              <path
                key={pkg}
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={isMobile ? 3 : 2.25}
                strokeDasharray={dashFor(style, isMobile)}
                strokeLinecap="round"
              />
            );
          })}

          {hoverIndex != null ? (
            <line
              x1={(pointsByPkg.get(packageNames[0]) ?? [])[hoverIndex]?.x ?? pad.l}
              x2={(pointsByPkg.get(packageNames[0]) ?? [])[hoverIndex]?.x ?? pad.l}
              y1={pad.t}
              y2={pad.t + innerH}
              stroke="var(--chart-grid)"
              strokeWidth={isMobile ? 2.8 : 1.6}
            />
          ) : null}
        </svg>

        {/* Footer: legend on the left, actions on the right. Wraps safely on small screens. */}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            {packageNames.map((pkg) => (
              <span
                key={pkg}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: paletteValue(settings.colors[pkg] ?? "slate") }}
                />
                <span className="min-w-0 max-w-[220px] truncate" title={pkg}>
                  {pkg}
                </span>
              </span>
            ))}
          </div>

          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
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

        {styleOpen ? (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label="Chart style"
          >
            <button
              type="button"
              aria-label="Close style panel"
              className="absolute inset-0 bg-black/60"
              onClick={() => setStyleOpen(false)}
            />
            <div
              ref={stylePanelRef}
              className="relative flex max-h-[min(85dvh,640px)] w-full flex-col overflow-hidden rounded-t-2xl border border-[color:var(--chart-tooltip-border)] bg-[color:var(--chart-tooltip-bg)] p-4 text-sm text-[color:var(--foreground)] shadow-xl sm:max-h-[min(70vh,560px)] sm:w-[min(28rem,92vw)] sm:rounded-2xl"
            >
              <div className="flex shrink-0 items-center justify-between gap-2">
                <div className="text-[11px] uppercase tracking-[0.35em] text-[color:var(--muted)]">Chart style</div>
                <button type="button" className={CHART_BUTTON_CLASSES + " px-2 py-1"} onClick={() => setStyleOpen(false)}>
                  Close
                </button>
              </div>

              <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 pb-4">
                <p className="text-[11px] uppercase tracking-[0.35em] text-[color:var(--muted)]">Series</p>
                <div className="mt-2 space-y-2">
                  {packageNames.map((pkg) => (
                    <div key={pkg} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
                      <div className="min-w-0 text-sm font-semibold text-[color:var(--foreground)]">
                        <div className="truncate" title={pkg}>
                          {pkg}
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-[11px] uppercase tracking-[0.35em] text-[color:var(--muted)]">Color</span>
                          <select
                            value={settings.colors[pkg] ?? "slate"}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                colors: { ...prev.colors, [pkg]: e.target.value as PaletteKey },
                              }))
                            }
                            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-2 text-sm text-[color:var(--foreground)]"
                          >
                            {PALETTE.map((p) => (
                              <option key={p.key} value={p.key}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[11px] uppercase tracking-[0.35em] text-[color:var(--muted)]">Line</span>
                          <select
                            value={settings.lineStyles[pkg] ?? "solid"}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                lineStyles: { ...prev.lineStyles, [pkg]: e.target.value as LineStyleKey },
                              }))
                            }
                            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-2 text-sm text-[color:var(--foreground)]"
                          >
                            <option value="solid">Solid</option>
                            <option value="dashed">Dashed</option>
                            <option value="dotted">Dotted</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {hovered ? (
          <div ref={tooltipRef} className={tooltipClassName}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[color:var(--foreground)]">{hovered.date}</span>
              <span className="text-[color:var(--muted)]">UTC</span>
            </div>
            <div className="mt-2 space-y-1">
              {packageNames.map((pkg) => (
                <div key={pkg} className="flex items-center justify-between gap-2">
                  <span className="text-[color:var(--muted)]">{pkg}</span>
                  <span className="font-mono">{numberFormatter.format(hovered.values[pkg]?.downloads ?? 0)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

    </section>
  );
}
