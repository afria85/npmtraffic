"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ActionMenu from "@/components/ui/ActionMenu";

const CHART_BUTTON_CLASSES =
  "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold leading-none text-slate-100 transition hover:border-white/20 hover:bg-white/10";

type CompareSeriesRow = {
  date: string;
  values: Record<string, { downloads: number; delta: number | null }>;
};

type Props = {
  series: CompareSeriesRow[];
  packageNames: string[];
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
const PAD = { l: 46, r: 16, t: 16, b: 30 } as const;

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

function dashFor(style: LineStyleKey) {
  if (style === "dashed") return "6 4";
  if (style === "dotted") return "2 4";
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

function svgToBlob(svgEl: SVGSVGElement) {
  const cloned = svgEl.cloneNode(true) as SVGSVGElement;
  cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const viewBox = cloned.getAttribute("viewBox") ?? "0 0 1000 260";
  const [, , w, h] = viewBox.split(" ").map((v) => Number(v));
  if (Number.isFinite(w) && Number.isFinite(h)) {
    cloned.setAttribute("width", String(w));
    cloned.setAttribute("height", String(h));
  }
  const xml = new XMLSerializer().serializeToString(cloned);
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

export default function CompareChart({ series, packageNames }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const settingsKey = `npmtraffic_chart_settings:compare:${packageNames.join("|")}`;

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [styleOpen, setStyleOpen] = useState(false);

  // Full-viewport portal root to avoid overflow clipping on mobile/compare
  const [modalRoot] = useState<HTMLDivElement | null>(() => {
    if (typeof document === "undefined") return null;
    const root = document.createElement("div");
    root.style.position = "fixed";
    root.style.inset = "0";
    root.style.zIndex = "2147483647";
    root.style.pointerEvents = "none";
    return root;
  });
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
    if (!modalRoot || typeof document === "undefined") return;
    document.body.appendChild(modalRoot);
    return () => {
      document.body.removeChild(modalRoot);
    };
  }, [modalRoot]);

  useEffect(() => {
    if (!styleOpen) return;
    if (typeof document === "undefined") return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setStyleOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [styleOpen]);

  const { maxValue, pointsByPkg } = useMemo(() => {
    const values: number[] = [];
    for (const row of series) {
      for (const pkg of packageNames) {
        const v = row.values[pkg]?.downloads;
        if (typeof v === "number" && Number.isFinite(v)) values.push(v);
      }
    }
    const maxValue = Math.max(1, ...values);

    const innerW = WIDTH - PAD.l - PAD.r;
    const innerH = HEIGHT - PAD.t - PAD.b;
    const xFor = (i: number) => PAD.l + innerW * (series.length <= 1 ? 0 : i / (series.length - 1));
    const yFor = (v: number) => PAD.t + innerH * (1 - v / maxValue);

    const pointsByPkg = new Map<string, Point[]>();
    for (const pkg of packageNames) {
      pointsByPkg.set(
        pkg,
        series.map((row, i) => ({ x: xFor(i), y: yFor(row.values[pkg]?.downloads ?? 0) }))
      );
    }
    return { maxValue, pointsByPkg };
  }, [series, packageNames]);

  const innerW = WIDTH - PAD.l - PAD.r;
  const innerH = HEIGHT - PAD.t - PAD.b;

  const yTicks = useMemo(() => {
    const ticks = 4;
    const values: { y: number; label: string }[] = [];
    for (let i = 0; i <= ticks; i += 1) {
      const ratio = i / ticks;
      const value = Math.round(maxValue * (1 - ratio));
      const y = PAD.t + innerH * ratio;
      values.push({ y, label: numberFormatter.format(value) });
    }
    return values;
  }, [maxValue, innerH]);

  const hovered = hoverIndex == null ? null : series[hoverIndex];

  const primaryPoints = pointsByPkg.get(packageNames[0] ?? "") ?? [];
  const hoverPoint = hoverIndex == null ? null : primaryPoints[hoverIndex] ?? null;

  const tooltipSide = hoverPoint && hoverPoint.x > PAD.l + innerW * 0.6 ? "left" : "right";
  const tooltipV = hoverPoint && hoverPoint.y < PAD.t + innerH * 0.35 ? "bottom" : "top";
  const tooltipDockClass =
    "pointer-events-none absolute w-[min(18rem,90%)] rounded-2xl border border-[color:var(--chart-tooltip-border)] bg-[color:var(--chart-tooltip-bg)] p-3 text-xs text-[color:var(--foreground)] shadow-sm shadow-black/20 backdrop-blur " +
    (tooltipSide === "left" ? "left-3" : "right-3") +
    " " +
    (tooltipV === "bottom" ? "bottom-3" : "top-3");

  const exports = useMemo(
    () => [
      {
        key: "svg",
        label: "Export SVG",
        onClick: () => {
          const svg = svgRef.current;
          if (!svg) return;
          const blob = svgToBlob(svg);
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

  const styleModal = useMemo(() => {
    if (!styleOpen || !modalRoot) return null;

    return createPortal(
      <div
        className="pointer-events-auto fixed inset-0"
        role="dialog"
        aria-modal="true"
        aria-label="Chart style"
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setStyleOpen(false)}
        />

        <div
          className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-lg rounded-t-2xl border border-[color:var(--chart-tooltip-border)] bg-[color:var(--chart-tooltip-bg)] p-4 text-[color:var(--foreground)] shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(32rem,92vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.35em] text-[color:var(--muted)]">Chart style</div>
              <div className="mt-1 text-sm text-[color:var(--foreground)]">Series formatting (local only)</div>
            </div>
            <button
              type="button"
              className={CHART_BUTTON_CLASSES + " px-2 py-1"}
              onClick={() => setStyleOpen(false)}
            >
              Close
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {packageNames.map((pkg) => (
              <div
                key={pkg}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div className="truncate text-sm font-semibold text-[color:var(--foreground)]">{pkg}</div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <div className="text-[11px] uppercase tracking-[0.35em] text-[color:var(--muted)]">Color</div>
                    <select
                      value={settings.colors[pkg] ?? "slate"}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          colors: { ...prev.colors, [pkg]: e.target.value as PaletteKey },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--foreground)]"
                    >
                      {PALETTE.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <div className="text-[11px] uppercase tracking-[0.35em] text-[color:var(--muted)]">Line</div>
                    <select
                      value={settings.lineStyles[pkg] ?? "solid"}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          lineStyles: { ...prev.lineStyles, [pkg]: e.target.value as LineStyleKey },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--foreground)]"
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
      </div>,
      modalRoot
    );
  }, [styleOpen, modalRoot, packageNames, settings]);

  
  return (
    <section className="relative rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Trend</p>
          <p className="mt-1 text-sm text-slate-200">Daily downloads (overlay)</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className={CHART_BUTTON_CLASSES} onClick={() => setStyleOpen((v) => !v)} aria-expanded={styleOpen}>
            Style
          </button>
          <ActionMenu label="Export" items={exports} buttonClassName={CHART_BUTTON_CLASSES} />
        </div>
      </div>

      <div className="relative mt-4">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-64 w-full"
          role="img"
          aria-label="Compare daily downloads line chart"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(event) => {
            const svg = event.currentTarget;
            const rect = svg.getBoundingClientRect();
            const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
            setHoverIndex(pickClosestIndex(x, series.length));
          }}
        >
          {yTicks.map((tick) => (
            <g key={tick.y}>
              <line x1={PAD.l} x2={PAD.l + innerW} y1={tick.y} y2={tick.y} stroke="var(--chart-grid)" />
              <text x={PAD.l - 8} y={tick.y + 4} textAnchor="end" fontSize="11" fill="var(--chart-axis)">
                {tick.label}
              </text>
            </g>
          ))}

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
                strokeWidth={2}
                strokeDasharray={dashFor(style)}
              />
            );
          })}

          {hoverIndex != null ? (
            <line
              x1={(pointsByPkg.get(packageNames[0]) ?? [])[hoverIndex]?.x ?? PAD.l}
              x2={(pointsByPkg.get(packageNames[0]) ?? [])[hoverIndex]?.x ?? PAD.l}
              y1={PAD.t}
              y2={PAD.t + innerH}
              stroke="var(--chart-grid)"
            />
          ) : null}
        </svg>
        {styleModal}

        {hovered ? (
          <div className={tooltipDockClass}>
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

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
        {packageNames.map((pkg) => (
          <span key={pkg} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: paletteValue(settings.colors[pkg] ?? "slate") }}
            />
            {pkg}
          </span>
        ))}
      </div>
    </section>
  );
}
