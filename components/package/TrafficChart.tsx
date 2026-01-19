"use client";

import { useMemo, useState } from "react";
import type { DerivedMetrics } from "@/lib/derived";
import type { TrafficSeriesRow } from "@/lib/traffic";
import { groupEventsByDate, loadEvents } from "@/lib/events";

type Point = { x: number; y: number };

type Props = {
  series: TrafficSeriesRow[];
  derived: DerivedMetrics;
  pkgName: string;
};

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

export default function TrafficChart({ series, derived, pkgName }: Props) {
  const [showMA7, setShowMA7] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const eventsByDate = useMemo(() => groupEventsByDate(loadEvents(pkgName)), [pkgName]);

  const { maxValue, downloadsPoints, ma7Points } = useMemo(() => {
    const downloads = series.map((row) => row.downloads);
    const ma7 = derived?.ma7?.map((v) => v?.value ?? null) ?? [];
    const candidateValues: number[] = [...downloads];
    for (const v of ma7) if (typeof v === "number" && Number.isFinite(v)) candidateValues.push(v);
    const maxValue = Math.max(1, ...candidateValues);

    const width = 1000;
    const height = 260;
    const pad = { l: 46, r: 16, t: 16, b: 30 };
    const innerW = width - pad.l - pad.r;
    const innerH = height - pad.t - pad.b;

    const xFor = (i: number) => pad.l + innerW * (series.length <= 1 ? 0 : i / (series.length - 1));
    const yFor = (v: number) => pad.t + innerH * (1 - v / maxValue);

    const downloadsPoints = series.map((row, i) => ({ x: xFor(i), y: yFor(row.downloads) }));
    const ma7Points = series.map((_, i) => {
      const value = ma7[i];
      if (typeof value !== "number" || !Number.isFinite(value)) return null;
      return { x: xFor(i), y: yFor(value) };
    });

    return { maxValue, downloadsPoints, ma7Points };
  }, [series, derived]);

  const width = 1000;
  const height = 260;
  const pad = { l: 46, r: 16, t: 16, b: 30 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const downloadsPath = useMemo(() => toPath(downloadsPoints), [downloadsPoints]);
  const ma7Path = useMemo(() => toPath(ma7Points.filter(Boolean) as Point[]), [ma7Points]);

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
  const hoveredMA7 = hoverIndex == null ? null : derived?.ma7?.[hoverIndex]?.value ?? null;
  const hoveredEvents = hovered ? eventsByDate.get(hovered.date) ?? [] : [];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Trend</p>
          <p className="mt-1 text-sm text-slate-200">Daily downloads</p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={showMA7}
            onChange={(event) => setShowMA7(event.target.checked)}
            className="h-4 w-4 accent-[color:var(--accent)]"
          />
          MA 7
        </label>
      </div>

      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-64 w-full"
          role="img"
          aria-label="Daily downloads line chart"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(event) => {
            const svg = event.currentTarget;
            const rect = svg.getBoundingClientRect();
            const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
            setHoverIndex(pickClosestIndex(x, series.length));
          }}
        >
          {/* grid */}
          {yTicks.map((tick) => (
            <g key={tick.y}>
              <line x1={pad.l} x2={pad.l + innerW} y1={tick.y} y2={tick.y} stroke="rgba(255,255,255,0.08)" />
              <text x={pad.l - 8} y={tick.y + 4} textAnchor="end" fontSize="11" fill="rgba(230,237,243,0.6)">
                {tick.label}
              </text>
            </g>
          ))}

          {/* event markers */}
          {series.map((row, index) => {
            const dayEvents = eventsByDate.get(row.date);
            if (!dayEvents?.length) return null;
            const x = downloadsPoints[index]?.x ?? null;
            if (x == null) return null;
            return (
              <g key={`evt-${row.date}`}>
                <line x1={x} x2={x} y1={pad.t} y2={pad.t + innerH} stroke="rgba(94,234,212,0.15)" />
                <circle cx={x} cy={pad.t + 6} r={4} fill="rgba(94,234,212,0.45)" />
              </g>
            );
          })}

          {/* downloads */}
          <path d={downloadsPath} fill="none" stroke="rgba(94,234,212,0.95)" strokeWidth={2.25} />

          {/* MA 7 */}
          {showMA7 && ma7Path ? (
            <path d={ma7Path} fill="none" stroke="rgba(230,237,243,0.55)" strokeWidth={1.6} strokeDasharray="5 4" />
          ) : null}

          {/* hover */}
          {hoverIndex != null ? (
            <g>
              <line
                x1={downloadsPoints[hoverIndex].x}
                x2={downloadsPoints[hoverIndex].x}
                y1={pad.t}
                y2={pad.t + innerH}
                stroke="rgba(230,237,243,0.16)"
              />
              <circle
                cx={downloadsPoints[hoverIndex].x}
                cy={downloadsPoints[hoverIndex].y}
                r={4.5}
                fill="rgba(94,234,212,0.95)"
              />
            </g>
          ) : null}
        </svg>

        {hovered ? (
          <div className="pointer-events-none absolute right-3 top-3 w-[min(18rem,90%)] rounded-2xl border border-white/10 bg-black/80 p-3 text-xs text-slate-200 shadow-sm shadow-black/40 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-slate-100">{hovered.date}</span>
              <span className="text-slate-400">UTC</span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Downloads</span>
                <span className="font-mono">{numberFormatter.format(hovered.downloads)}</span>
              </div>
              {showMA7 && typeof hoveredMA7 === "number" ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">MA 7</span>
                  <span className="font-mono">{hoveredMA7.toFixed(1)}</span>
                </div>
              ) : null}
            </div>
            {hoveredEvents.length ? (
              <div className="mt-2 border-t border-white/10 pt-2">
                <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">Events</p>
                <ul className="mt-1 space-y-1">
                  {hoveredEvents.slice(0, 3).map((evt) => (
                    <li key={`${evt.date_utc}|${evt.event_type}|${evt.label}`} className="text-slate-200">
                      <span className="text-slate-400">{evt.event_type}</span>: {evt.label}
                    </li>
                  ))}
                  {hoveredEvents.length > 3 ? <li className="text-slate-400">...</li> : null}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
