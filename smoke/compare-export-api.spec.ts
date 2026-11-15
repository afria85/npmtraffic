import { expect, test } from "@playwright/test";
import type { CompareData } from "../lib/compare";

const six = "react,vue,svelte,angular,axios,next";
const capped = ["angular", "axios", "next", "react", "svelte"];
const longName = "a".repeat(214);
const routes = ["", ".json", ".csv", ".excel.csv"] as const;

type Scenario = [string, string, string[], number?, number?, number?, number?];
const cases: Scenario[] = [
  ["two", "react,vue", ["react", "vue"]],
  ["two reordered", "vue,react", ["react", "vue"]],
  ["five", "vue,react,svelte,angular,axios", ["angular", "axios", "react", "svelte", "vue"]],
  ["six", six, capped, 1],
  ["six reordered", "next,axios,angular,svelte,vue,react", capped, 1],
  ["seven", six + ",webpack", capped, 2],
  ["invalid before cap", six + ",!invalid", capped.slice(0, 4), 2, 1],
  ["invalid beyond cap", six + ",zz invalid", capped, 2],
  ["unavailable beyond cap", "a,b,c,d,e,missing-export-fixture", ["a","b","c","d","e"], 1],
  ["duplicates", "vue, REACT,react,Vue", ["react", "vue"], 0, 0, 0, 2],
  ["duplicate only", "react,react", []],
  ["invalid", "react,vue,bad name", ["react", "vue"], 0, 1],
  ["too few after validation", "react,!invalid", []],
  ["not found", "react,vue,missing-export-fixture", ["react", "vue"], 0, 0, 1],
  ["too few after fetch", "react,missing-export-fixture", []],
  ["scoped", "@scope/name,react", ["@scope/name", "react"]],
  ["unsafe input", 'react,vue,=1+1\r\n"<tag>', ["react", "vue"], 0, 1],
  ["long filename", longName + "," + six, [longName, ...capped.slice(0, 4)], 2],
  ["verified zero and gaps", "integrity-fixture,react", ["integrity-fixture", "react"]],
];

function compareQuery(packages: string, days = "7") {
  return new URLSearchParams({ packages, days }).toString();
}

for (const [label, input, packages, cap = 0, invalid = 0, unavailable = 0, duplicate = 0] of cases) {
  test(`compare export contract: ${label}`, async ({ request }) => {
    const query = compareQuery(input);
    const requested = packages.length + cap + invalid + unavailable;
    let json: CompareData | undefined;
    for (const extension of routes) {
      const response = await request.get(`/api/v1/compare${extension}?${query}`);
      const headers = response.headers();
      expect(headers["x-request-id"]).toBeTruthy();
      if (!packages.length) {
        expect(response.status()).toBe(400);
        expect(await response.json()).toEqual({
          error: { code: "INVALID_REQUEST", message: "compare requires 2-5 packages" },
        });
        expect(headers["content-disposition"]).toBeUndefined();
        expect(headers["x-compare-cap-applied"]).toBeUndefined();
        continue;
      }
      expect(response.status()).toBe(200);
      expect(headers["cache-control"]).toBe("no-store");
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["x-compare-cap-applied"]).toBe(String(cap > 0));
      expect(headers["x-compare-exported-count"]).toBe(String(packages.length));
      expect(headers["x-compare-cap-omitted-count"]).toBe(String(cap));
      expect(headers["x-compare-invalid-count"]).toBe(String(invalid));
      expect(headers["x-compare-unavailable-count"]).toBe(String(unavailable));
      expect(headers["x-compare-duplicate-count"]).toBe(String(duplicate));

      const filename = headers["content-disposition"].match(/^attachment; filename="([@a-z0-9._-]+)"$/)?.[1];
      expect(filename).toBeTruthy();
      const format = extension || ".json";
      const marker = cap ? `__truncated-${packages.length}-of-${requested}`
        : invalid || unavailable ? `__partial-${packages.length}-of-${requested}` : "";
      const suffix = `${marker}__7d__`;
      expect(filename).toMatch(new RegExp(`${suffix}[0-9-]+__utc${format.replaceAll(".", "\\.")}$`));
      if (label === "long filename") {
        expect(filename).toHaveLength(180);
        expect(filename).toMatch(/__[0-9a-f]{16}__truncated-5-of-7/);
      } else {
        expect(filename).toMatch(`npmtraffic__${packages.join("__").replaceAll("/", "__")}${suffix}`);
      }

      if (!extension.endsWith(".csv")) {
        const payload = await response.json() as CompareData;
        expect(payload.selection).toEqual({
          requestedCount: requested, exportedPackages: packages, exportedCount: packages.length,
          capApplied: cap > 0, capOmittedCount: cap, invalidCount: invalid,
          unavailableCount: unavailable, duplicateCount: duplicate,
        });
        expect(payload.packages.map(({ name }) => name)).toEqual(packages);
        expect((payload.warnings ?? []).length).toBe(Number(cap > 0) + invalid + unavailable);
        if (json) {
          expect(payload).toMatchObject({
            days: json.days, range: json.range, packages: json.packages,
            coverage: json.coverage, series: json.series, selection: json.selection,
          });
          expect(payload.warnings).toEqual(json.warnings);
        }
        json = payload;
        continue;
      }

      const excel = extension === ".excel.csv";
      const delimiter = excel ? ";" : ",";
      const lines = (await response.text()).split("\n");
      if (excel) expect(lines.shift()).toBe("sep=;");
      const metadata = lines.splice(0, 12);
      expect(metadata.map(line => line.split("=")[0])).toEqual([
        "# from", "# to", "# timezone", "# generated_at", "# source", "# request_id",
        "# cache_status", "# is_stale", "# stale_reason", "# requested_days", "# included_days",
        "# latest_included_date",
      ]);
      const guarded = (name: string) => /^[-@]/.test(name) ? "'" + name : name;
      expect(lines.shift()?.split(delimiter)).toEqual([
        "date", ...packages.flatMap(name => [guarded(name) + " downloads", guarded(name) + " delta"]),
        "included", ...packages.flatMap(name => [" status", " upstream downloads", " registry downloads"]
          .map(suffix => guarded(name) + suffix)),
      ]);
      expect(lines).toHaveLength(7);
      expect(lines.map(line => line.split(delimiter))).toEqual(json!.series.map(({ date, values, included }) => [
        date, ...packages.flatMap(name => [values[name].downloads, values[name].delta]), String(included),
        ...packages.flatMap(name => [values[name].status, values[name].upstreamDownloads, values[name].registryDownloads]),
      ].map(value => value == null ? "" : String(value))));
      if (label === "verified zero and gaps") {
        expect(lines[0].split(delimiter)[1]).toBe("0");
        expect(lines[2].split(delimiter).slice(1, 6)).toEqual(["", "", "", "", "false"]);
        expect(lines[3].split(delimiter).slice(6, 8)).toEqual(["unverified", "100000000000"]);
      }
    }
  });
}
