import { useLayoutEffect, useMemo, useRef } from "react";
import { buildMonthTicks } from "./time-ticks";

type Props = {
  series: { date: string }[];
  left: number;
  plotWidth: number;
  y: number;
  fontSize: number;
};

const LABEL_GAP = 8;
const EDGE_PADDING = 2;

export function TimelineAxis({ series, left, plotWidth, y, fontSize }: Props) {
  const groupRef = useRef<SVGGElement>(null);
  const ticks = useMemo(() => buildMonthTicks(series, 6, "first-or-change", true), [series]);

  useLayoutEffect(() => {
    const group = groupRef.current;
    const svg = group?.ownerSVGElement;
    if (!group || !svg) return;

    const layout = () => {
      const viewport = svg.getBoundingClientRect();
      const scaleX = svg.getScreenCTM?.()?.a;
      if (!scaleX || !viewport.width) return;
      const labels = Array.from(group.querySelectorAll("text"));
      for (const label of labels) label.removeAttribute("transform");
      const bounds = labels.map((label) => label.getBoundingClientRect());
      const occupied: { left: number; right: number }[] = [];

      // Reserve space for the latest and earliest months before fitting interior labels.
      const priority = [labels.length - 1, ...labels.slice(0, -1).map((_, index) => index)];
      for (const index of priority) {
        const label = labels[index];
        if (!label) continue;
        const box = bounds[index];
        const minLeft = viewport.left + EDGE_PADDING;
        const maxRight = viewport.right - EDGE_PADDING;
        const shift = Math.max(minLeft - box.left, Math.min(0, maxRight - box.right));
        const labelLeft = box.left + shift;
        const right = box.right + shift;
        const fits = right <= maxRight + 0.01 && occupied.every((other) =>
          right + LABEL_GAP <= other.left || labelLeft >= other.right + LABEL_GAP,
        );

        label.setAttribute("visibility", fits ? "visible" : "hidden");
        if (!fits) continue;
        if (shift) label.setAttribute("transform", `translate(${shift / scaleX} 0)`);
        occupied.push({ left: labelLeft, right });
      }
    };

    layout();
    const fonts = svg.ownerDocument.fonts;
    fonts?.addEventListener("loadingdone", layout);
    return () => fonts?.removeEventListener("loadingdone", layout);
  }, [ticks, left, plotWidth, y, fontSize]);

  return (
    <g ref={groupRef} data-chart-axis="timeline">
      {ticks.map((tick) => {
        const x = left + plotWidth * (series.length <= 1 ? 0 : tick.index / (series.length - 1));
        return (
          <g key={tick.index}>
            <line x1={x} x2={x} y1={y} y2={y + 6} stroke="var(--chart-grid)" />
            <text x={x} y={y + 24} textAnchor="middle" fontSize={fontSize} fill="var(--chart-axis)">
              {tick.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
