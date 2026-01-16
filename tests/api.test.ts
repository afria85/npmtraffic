import assert from "node:assert/strict";
import { test } from "node:test";
import { GET as getDaily } from "../app/api/v1/package/[name]/daily/route";
import { GET as getSearch } from "../app/api/v1/search/route";

test("daily API returns requestId and series", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.startsWith("https://api.npmjs.org/downloads/range/last-30-days/react")) {
      return new Response(
        JSON.stringify({
          start: "2024-01-01",
          end: "2024-01-02",
          package: "react",
          downloads: [
            { day: "2024-01-01", downloads: 10 },
            { day: "2024-01-02", downloads: 12 },
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
  const body = (await res.json()) as { requestId?: string; series?: unknown[] };
  assert.equal(typeof body.requestId, "string");
  assert.equal(Array.isArray(body.series), true);
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
  const body = (await res.json()) as { q?: string; results?: Array<{ name: string }> };
  assert.equal(body.q, "react");
  assert.equal(body.results?.[0]?.name, "react");
});
