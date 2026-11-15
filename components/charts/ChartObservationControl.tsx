"use client";

import { useCallback, useEffect, useId, useRef, useState, type RefObject } from "react";
import type { Observation } from "@/lib/observations";

const downloadsFormat = new Intl.NumberFormat("en-US");

export function describeDownloads(value: number | null, status?: Observation["status"]) {
  if (value !== null) return downloadsFormat.format(value) + " downloads";
  if (status === "unverified") return "unverified";
  if (status === "available") return "excluded from the shared comparison";
  return "missing";
}

export function useChartInspection(svg: RefObject<SVGSVGElement | null>, length: number) {
  const control = useRef<HTMLInputElement>(null);
  const [pointerIndex, setPointerIndex] = useState<number | null>(null);
  const [controlIndex, setControlIndex] = useState<number | null>(null);
  const index = pointerIndex ?? controlIndex;
  const hoverIndex = index !== null && index < length ? index : null;
  const active = hoverIndex !== null;

  const inspect = useCallback((next: number | null) => {
    setPointerIndex(null);
    setControlIndex(next);
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") inspect(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !svg.current?.contains(event.target) &&
          !control.current?.contains(event.target)) inspect(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [active, inspect, svg]);

  return { hoverIndex, setHoverIndex: setPointerIndex, inspect, control, setControlIndex };
}

export default function ChartObservationControl({
  length, describe, inspect, control, onBlur,
}: {
  length: number;
  describe: (index: number) => string;
  inspect: (index: number) => void;
  control: RefObject<HTMLInputElement | null>;
  onBlur: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const observationId = useId();
  if (length === 0) return null;
  const index = Math.min(selected, length - 1);
  const observation = describe(index);

  function select(next: number) {
    setSelected(next);
    inspect(next);
  }

  return (
    <>
      <label className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--foreground-secondary)]">
        <span>Inspect daily downloads</span>
        <input
          ref={control}
          className="h-7 min-w-0 max-w-full flex-1 basis-32 accent-[var(--accent)]"
          type="range"
          min={0}
          max={length - 1}
          step={1}
          value={index}
          aria-valuetext={observation}
          aria-describedby={observationId}
          onFocus={() => inspect(index)}
          onBlur={onBlur}
          onChange={event => select(event.currentTarget.valueAsNumber)}
          onKeyDown={event => {
            // Also reopen at an endpoint when its native value would stay the same.
            if (event.key === "Home" || event.key === "End") {
              event.preventDefault();
              select(event.key === "Home" ? 0 : length - 1);
            }
          }}
        />
      </label>
      <output className="sr-only">
        <span id={observationId}>{observation}</span>
      </output>
    </>
  );
}
