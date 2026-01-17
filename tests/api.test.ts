import assert from "node:assert/strict";
import { test } from "node:test";
import { GET as getDaily } from "../app/api/v1/package/[name]/daily/route";
import { GET as getSearch } from "../app/api/v1/search/route";
import { GET as getCompare } from "../app/api/v1/compare/route";
import { rangeForDays } from "../lib/query";
import { GET as getDailyCsv } from "../app/api/v1/package/[name]/daily.csv/route";
import { GET as getDailyJson } from "../app/api/v1/package/[name]/daily.json/route";
import { GET as getCompare } from "../app/api/v1/compare/route";
import { GET as getCompareCsv } from "../app/api/v1/compare.csv/route";

test("daily API returns traffic response shape", async (t) => {
  const originalFetch = globalThis.fetch;
  const expectedRange = rangeForDays(30);
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (
      url.startsWith(
        `https://api.npmjs.org/downloads/range/${expectedRange.startDate}:${expectedRange.endDate}/react`
      )
    ) {
      return new Response(
        JSON.stringify({
        start: expectedRange.startDate,
        end: expectedRange.endDate,
          package: "react",
          downloads: [
            { day: "2024-01-31", downloads: 10 },
            { day: "2024-02-01", downloads: 12 },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    return new Response("not found", { status: 404 });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const req = new Request("http://localhost/api/v1/package/react/daily?days=30");
  const res = await getDaily(req, { params: Promise.resolve({ name: "react" }) });
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    package?: string;
    range?: { startDate?: string; endDate?: string };
    series?: unknown[];
    totals?: { sum?: number };
    meta?: { cacheStatus?: string };
    derived?: { ma3?: unknown[]; ma7?: unknown[]; outliers?: unknown[] };
  };
  assert.equal(body.package, "react");
  assert.equal(typeof body.range?.startDate, "string");
  assert.equal(typeof body.range?.endDate, "string");
  assert.equal(Array.isArray(body.series), true);
  assert.equal(typeof body.totals?.sum, "number");
  assert.equal(typeof body.meta?.cacheStatus, "string");
  assert.ok(Array.isArray(body.derived?.ma3));
  assert.ok(Array.isArray(body.derived?.ma7));
  assert.ok(Array.isArray(body.derived?.outliers));
});

test("daily API supports long-range normalization", async (t) => {
  const originalFetch = globalThis.fetch;
  const expectedRange = rangeForDays(90);
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (
      url.startsWith(
        `https://api.npmjs.org/downloads/range/${expectedRange.startDate}:${expectedRange.endDate}/react`
      )
    ) {
      return new Response(
        JSON.stringify({
          start: expectedRange.startDate,
          end: expectedRange.endDate,
          package: "react",
          downloads: [
            { day: expectedRange.startDate, downloads: 5 },
            { day: expectedRange.endDate, downloads: 7 },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    return new Response("not found", { status: 404 });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const req = new Request("http://localhost/api/v1/package/react/daily?days=90");
  const res = await getDaily(req, { params: Promise.resolve({ name: "react" }) });
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    range?: { days?: number; startDate?: string; endDate?: string };
    series?: unknown[];
  };
  assert.equal(body.range?.days, 90);
  assert.equal(body.range?.startDate, expectedRange.startDate);
  assert.equal(body.range?.endDate, expectedRange.endDate);
  assert.equal(body.series?.length, 90);
});

test("daily CSV export includes metadata comments", async (t) => {
  const originalFetch = globalThis.fetch;
  const expectedRange = rangeForDays(30);
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (
      url.startsWith(
        `https://api.npmjs.org/downloads/range/${expectedRange.startDate}:${expectedRange.endDate}/react`
      )
    ) {
      return new Response(
        JSON.stringify({
          start: expectedRange.startDate,
          end: expectedRange.endDate,
          package: "react",
          downloads: [
            { day: "2024-01-31", downloads: 10 },
            { day: "2024-02-01", downloads: 12 },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    return new Response("not found", { status: 404 });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const req = new Request("http://localhost/api/v1/package/react/daily.csv?days=30");
  const res = await getDailyCsv(req, { params: Promise.resolve({ name: "react" }) });
  assert.equal(res.status, 200);
  const text = await res.text();
  const lines = text.split("\n");
  assert.ok(lines[0].startsWith("# from="));
  assert.ok(lines[1].startsWith("# to="));
  assert.ok(lines[2].startsWith("# timezone=UTC"));
  assert.ok(lines[3].startsWith("# generated_at="));
  assert.ok(lines[4].startsWith("# source="));
  assert.ok(lines[5].startsWith("# request_id="));
  assert.ok(lines[6].startsWith("# cache_status="));
  assert.ok(lines[7].startsWith("# is_stale="));
  assert.ok(lines[8].startsWith("# stale_reason="));
  assert.equal(lines[9], "date,downloads,ma3,ma7,is_outlier,outlier_score");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  const disposition = res.headers.get("content-disposition") ?? "";
  assert.ok(disposition.startsWith('attachment; filename="npmtraffic__react'));
});

test("daily CSV export matches long-range row count", async (t) => {
  const originalFetch = globalThis.fetch;
  const expectedRange = rangeForDays(90);
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (
      url.startsWith(
        `https://api.npmjs.org/downloads/range/${expectedRange.startDate}:${expectedRange.endDate}/react`
      )
    ) {
      return new Response(
        JSON.stringify({
          start: expectedRange.startDate,
          end: expectedRange.endDate,
          package: "react",
          downloads: [
            { day: expectedRange.startDate, downloads: 5 },
            { day: expectedRange.endDate, downloads: 7 },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    return new Response("not found", { status: 404 });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const req = new Request("http://localhost/api/v1/package/react/daily.csv?days=90");
  const res = await getDailyCsv(req, { params: Promise.resolve({ name: "react" }) });
  assert.equal(res.status, 200);
  const text = await res.text();
  const lines = text.trim().split("\n");
  // 9 comment lines + header + 90 data rows
  assert.equal(lines.length, 9 + 1 + 90);
});

test("daily CSV export attachment header sanitizes scoped names", async (t) => {
  const originalFetch = globalThis.fetch;
  const expectedRange = rangeForDays(30);
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("/@scope/name") || url.includes("/%40scope%2Fname")) {
      return new Response(
        JSON.stringify({
          start: expectedRange.startDate,
          end: expectedRange.endDate,
          package: "@scope/name",
          downloads: [
            { day: expectedRange.startDate, downloads: 5 },
            { day: expectedRange.endDate, downloads: 5 },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    return new Response("not found", { status: 404 });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const req = new Request("http://localhost/api/v1/package/%40scope%2Fname/daily.csv?days=30");
  const res = await getDailyCsv(req, { params: Promise.resolve({ name: "@scope/name" }) });
  assert.equal(res.status, 200);
  const disposition = res.headers.get("content-disposition") ?? "";
  assert.ok(disposition.includes("npmtraffic__@scope__name"));
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
});

test("daily JSON export returns audit metadata", async (t) => {
  const originalFetch = globalThis.fetch;
  const expectedRange = rangeForDays(14);
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (
      url.startsWith(
        `https://api.npmjs.org/downloads/range/${expectedRange.startDate}:${expectedRange.endDate}/react`
      )
    ) {
      return new Response(
        JSON.stringify({
          start: expectedRange.startDate,
          end: expectedRange.endDate,
          package: "react",
          downloads: [
            { day: "2024-01-01", downloads: 5 },
            { day: "2024-01-02", downloads: 7 },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    return new Response("not found", { status: 404 });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const req = new Request("http://localhost/api/v1/package/react/daily.json?days=14");
  const res = await getDailyJson(req, { params: Promise.resolve({ name: "react" }) });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.package, "react");
  assert.equal(body.range.days, 14);
  assert.equal(typeof body.meta?.timezone, "string");
  assert.equal(body.meta.timezone, "UTC");
  assert.equal(typeof body.meta?.generatedAt, "string");
  assert.equal(typeof body.meta?.source, "string");
  assert.equal(typeof body.meta?.cacheStatus, "string");
  assert.equal(typeof body.meta?.isStale, "boolean");
  assert.equal(typeof body.meta?.requestId, "string");
  assert.ok(body.meta?.export);
  assert.equal(body.meta?.export?.from, body.range.startDate);
  assert.equal(body.meta?.export?.timezone, "UTC");
  assert.equal(typeof body.meta?.export?.generatedAt, "string");
  assert.equal(typeof body.meta?.export?.requestId, "string");
  assert.equal(typeof body.meta?.export?.cacheStatus, "string");
});

test("compare JSON export includes metadata block", async (t) => {
  const originalFetch = globalThis.fetch;
  const expectedRange = rangeForDays(30);
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("/react")) {
      return new Response(
        JSON.stringify({
          start: expectedRange.startDate,
          end: expectedRange.endDate,
          package: "react",
          downloads: [
            { day: expectedRange.startDate, downloads: 5 },
            { day: expectedRange.endDate, downloads: 7 },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    if (url.includes("/vue")) {
      return new Response(
        JSON.stringify({
          start: expectedRange.startDate,
          end: expectedRange.endDate,
          package: "vue",
          downloads: [
            { day: expectedRange.startDate, downloads: 8 },
            { day: expectedRange.endDate, downloads: 9 },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    return new Response("not found", { status: 404 });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const req = new Request("http://localhost/api/v1/compare?packages=react,vue&days=30");
  const res = await getCompare(req);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.export);
  assert.equal(body.export.timezone, "UTC");
  assert.ok(typeof body.export.generatedAt === "string");
  assert.ok(typeof body.export.requestId === "string");
  assert.equal(body.export.cacheStatus, "MISS");
  assert.equal(body.export.isStale, false);
  const disposition = res.headers.get("content-disposition") ?? "";
  assert.ok(disposition.includes("npmtraffic__react__vue"));
  assert.ok(disposition.endsWith(".json\""));
});

test("compare CSV export includes metadata comments", async (t) => {
  const originalFetch = globalThis.fetch;
  const expectedRange = rangeForDays(30);
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("/react") || url.includes("/vue")) {
      return new Response(
        JSON.stringify({
          start: expectedRange.startDate,
          end: expectedRange.endDate,
          package: url.includes("/react") ? "react" : "vue",
          downloads: [
            { day: expectedRange.startDate, downloads: 5 },
            { day: expectedRange.endDate, downloads: 7 },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    return new Response("not found", { status: 404 });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const req = new Request("http://localhost/api/v1/compare.csv?packages=react,vue&days=30");
  const res = await getCompareCsv(req);
  assert.equal(res.status, 200);
  const text = await res.text();
  const lines = text.split("\n");
  assert.ok(lines[0].startsWith("# from="));
  assert.ok(lines[1].startsWith("# to="));
  assert.ok(lines[2].startsWith("# timezone=UTC"));
  assert.ok(lines[3].startsWith("# generated_at="));
  assert.ok(lines[4].startsWith("# source="));
  assert.ok(lines[5].startsWith("# request_id="));
  assert.ok(lines[6].startsWith("# cache_status="));
  assert.ok(lines[7].startsWith("# is_stale="));
  assert.ok(lines[8].startsWith("# stale_reason="));
  assert.ok(lines[9].startsWith("date"));
  const disposition = res.headers.get("content-disposition") ?? "";
  assert.ok(disposition.includes("npmtraffic__react__vue"));
});

test("search API returns normalized results", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.startsWith("https://registry.npmjs.org/-/v1/search")) {
      return new Response(
        JSON.stringify({
          objects: [
            {
              package: { name: "react", version: "18.2.0", description: "React" },
              score: { final: 1 },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    return new Response("not found", { status: 404 });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const req = new Request("http://localhost/api/v1/search?q=react&limit=10");
  const res = await getSearch(req);
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    query?: string;
    items?: Array<{ name: string }>;
    meta?: { cacheStatus?: string };
  };
  assert.equal(body.query, "react");
  assert.equal(body.items?.[0]?.name, "react");
  assert.equal(typeof body.meta?.cacheStatus, "string");
});

test("compare API requires packages", async () => {
  const req = new Request("http://localhost/api/v1/compare");
  const res = await getCompare(req);
  assert.equal(res.status, 400);
  const payload = (await res.json()) as { error?: { code?: string } };
  assert.equal(payload.error?.code, "INVALID_REQUEST");
});
