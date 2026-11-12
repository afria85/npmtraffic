import { listDatesBetween } from "../../lib/dates";

export function registryFixture(input: string | URL | Request) {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const match = /^\/downloads\/range\/([0-9-]+):([0-9-]+)$/.exec(url.pathname);
  if (url.hostname !== "api.npmjs.org" || !match) return undefined;
  const [, start, end] = match;
  return Response.json({
    start, end,
    downloads: listDatesBetween(start, end).map((day) => ({ day, downloads: 100_000 })),
  });
}
