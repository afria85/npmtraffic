export function toObservationPath(points: ({ x: number; y: number | null } | null)[]) {
  const commands: string[] = [];
  let segmentLength = 0;
  for (const point of points) {
    if (point?.y == null) {
      if (segmentLength === 1) commands.push("h 0");
      segmentLength = 0;
      continue;
    }
    commands.push(`${segmentLength ? "L" : "M"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
    segmentLength++;
  }
  if (segmentLength === 1) commands.push("h 0");
  return commands.join(" ");
}
