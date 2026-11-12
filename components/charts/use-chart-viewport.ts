import { useLayoutEffect, useState, type RefObject } from "react";

export function useChartViewport(svgRef: RefObject<SVGSVGElement | null>) {
  const [viewport, setViewport] = useState({ width: 1000, height: 260 });

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const update = () => {
      const width = svg.clientWidth;
      const height = svg.clientHeight;
      if (width === 0 || height === 0) return;
      setViewport((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      );
    };

    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [svgRef]);

  return viewport;
}
