"use client";

import { useMemo, useState } from "react";

type CompareSeriesRow = {
  date: string;
  values: Record<string, { downloads: number; delta: number | null }>;
};

type Props = {
  series: CompareSeriesRow[];
  packageNames: string[];
};

type Point = { x: number; y: number };

const numberFormatter = new Intl.NumberFormat("en-US");

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

const STROKES = [
  "rgba(94,234,212,0.95)",
  "rgba(230,237,243,0.70)",
  "rgba(230,237,243,0.55)",
  "rgba(230,237,243,0.40)",
  "rgba(230,237,243,0.28)",
];

export default function CompareChart({ series, packageNames }: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { maxValue, pointsByPkg } = useMemo(() => {
    const values: number[] = [];
    for (const row of series) {
      for (const pkg of packageNames) {
        const v = row.values[pkg]?.downloads;
        if (typeof v === "number" && Number.isFinite(v)) values.push(v);
      }
    }
    const maxValue = Math.max(1, ...values);

    const width = 1000;
    const height = 260;
    const pad = { l: 46, r: 16, t: 16, b: 30 };
    const innerW = width - pad.l - pad.r;
    const innerH = height - pad.t - pad.b;
    const xFor = (i: number) => pad.l + innerW * (series.length <= 1 ? 0 : i / (series.length - 1));
    const yFor = (v: number) => pad.t + innerH * (1 - v / maxValue);

    const pointsByPkg = new Map<string, Point[]>();
    for (const pkg of packageNames) {
      pointsByPkg.set(
        pkg,
        series.map((row, i) => ({ x: xFor(i), y: yFor(row.values[pkg]?.downloads ?? 0) }))
      );
    }
    return { maxValue, pointsByPkg };
  }, [series, packageNames]);

  const width = 1000;
  const height = 260;
  const pad = { l: 46, r: 16, t: 16, b: 30 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

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

  const hovered = hoverIndex == null ? null : series[hoverIndex];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-500">Trend</p>
        <p className="mt-1 text-sm text-slate-200">Daily downloads (overlay)</p>
      </div>

      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
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
              <line x1={pad.l} x2={pad.l + innerW} y1={tick.y} y2={tick.y} stroke="rgba(255,255,255,0.08)" />
              <text x={pad.l - 8} y={tick.y + 4} textAnchor="end" fontSize="11" fill="rgba(230,237,243,0.6)">
                {tick.label}
              </text>
            </g>
          ))}

          {packageNames.map((pkg, idx) => {
            const points = pointsByPkg.get(pkg) ?? [];
            const path = toPath(points);
            if (!path) return null;
            return (
              <path
                key={pkg}
                d={path}
                fill="none"
                stroke={STROKES[idx] ?? STROKES[STROKES.length - 1]}
                strokeWidth={2}
              />
            );
          })}

          {hoverIndex != null ? (
            <line
              x1={(pointsByPkg.get(packageNames[0]) ?? [])[hoverIndex]?.x ?? pad.l}
              x2={(pointsByPkg.get(packageNames[0]) ?? [])[hoverIndex]?.x ?? pad.l}
              y1={pad.t}
              y2={pad.t + innerH}
              stroke="rgba(230,237,243,0.16)"
            />
          ) : null}
        </svg>

        {hovered ? (
          <div className="pointer-events-none absolute right-3 top-3 w-[min(18rem,90%)] rounded-2xl border border-white/10 bg-black/80 p-3 text-xs text-slate-200 shadow-sm shadow-black/40 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-slate-100">{hovered.date}</span>
              <span className="text-slate-400">UTC</span>
            </div>
            <div className="mt-2 space-y-1">
              {packageNames.map((pkg) => (
                <div key={pkg} className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">{pkg}</span>
                  <span className="font-mono">{numberFormatter.format(hovered.values[pkg]?.downloads ?? 0)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
        {packageNames.map((pkg, idx) => (
          <span key={pkg} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: STROKES[idx] ?? STROKES[STROKES.length - 1] }} />
            {pkg}
          </span>
        ))}
      </div>
    </section>
  );
}
