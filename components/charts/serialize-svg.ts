export function serializeChartSvg(svg: SVGSVGElement) {
  const document = svg.ownerDocument;
  const view = document.defaultView;
  const style = view?.getComputedStyle(document.documentElement);
  // Set DOM attributes before serialization so the serializer escapes CSS values.
  for (const element of [svg, ...svg.querySelectorAll("*")]) {
    for (const attribute of ["fill", "stroke", "stop-color"]) {
      const value = element.getAttribute(attribute);
      const name = value && /^var\((--[a-zA-Z0-9_-]+)\)$/.exec(value)?.[1];
      const resolved = name && style?.getPropertyValue(name).trim();
      if (resolved) element.setAttribute(attribute, resolved);
    }
  }
  return new (view?.XMLSerializer ?? XMLSerializer)().serializeToString(svg);
}
