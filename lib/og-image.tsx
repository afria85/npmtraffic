import { ImageResponse } from "next/og";

const WIDTH = 1200;
const HEIGHT = 630;

const ACCENT = "#60a5fa";
const BG = "#0b0f14";
const FG = "#e6edf3";
const MUTED = "#94a3b8";

function clampText(value: string, max = 80) {
  const v = (value ?? "").trim();
  if (!v) return "";
  return v.length > max ? `${v.slice(0, Math.max(0, max - 3))}...` : v;
}

const CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=604800";

type OgImageOptions =
  | { mode: "pkg"; pkg: string; days: number }
  | { mode: "compare"; pkgs: string[]; days: number };

function createHeader(days: number) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: ACCENT,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: -0.5,
          }}
        >
          t
        </div>
        <div style={{ color: FG, fontSize: 26, fontWeight: 700 }}>npmtraffic</div>
      </div>
      <div style={{ color: MUTED, fontSize: 18 }}>{days} days</div>
    </div>
  );
}

function createFooter() {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div style={{ color: MUTED, fontSize: 18 }}>npmtraffic.com</div>
      <div style={{ color: ACCENT, fontSize: 18, fontWeight: 700 }}>Not affiliated with npm, Inc.</div>
    </div>
  );
}

function createPackageLayout(pkg: string, days: number) {
  const clamped = clampText(pkg, 80) || "npm package";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: BG,
        padding: 72,
        justifyContent: "space-between",
      }}
    >
      {createHeader(days)}
      <div style={{ marginTop: 36 }}>
        <div style={{ color: MUTED, fontSize: 18, letterSpacing: 3, textTransform: "uppercase" }}>Daily downloads</div>
        <div
          style={{
            marginTop: 14,
            color: FG,
            fontSize: 74,
            fontWeight: 800,
            letterSpacing: -2.5,
            lineHeight: 1.05,
          }}
        >
          {clamped}
        </div>
        <div style={{ marginTop: 18, color: MUTED, fontSize: 26 }}>
          Table · chart · local event markers · reproducible exports
        </div>
      </div>
      {createFooter()}
    </div>
  );
}

function createCompareLayout(pkgs: string[], days: number) {
  const title = pkgs.length ? pkgs.join(" vs ") : "Compare npm packages";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: BG,
        padding: 72,
        justifyContent: "space-between",
      }}
    >
      {createHeader(days)}
      <div style={{ marginTop: 36 }}>
        <div style={{ color: MUTED, fontSize: 18, letterSpacing: 3, textTransform: "uppercase" }}>Compare</div>
        <div
          style={{
            marginTop: 14,
            color: FG,
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1.05,
          }}
        >
          {clampText(title, 120)}
        </div>
        <div style={{ marginTop: 18, color: MUTED, fontSize: 26 }}>
          Daily downloads · deltas · export-ready
        </div>
      </div>
      {createFooter()}
    </div>
  );
}

export function buildOgImageResponse(options: OgImageOptions) {
  const response = new ImageResponse(
    options.mode === "compare"
      ? createCompareLayout(options.pkgs, options.days)
      : createPackageLayout(options.pkg, options.days),
    { width: WIDTH, height: HEIGHT }
  );
  response.headers.set("Content-Type", "image/png");
  response.headers.set("Cache-Control", CACHE_CONTROL);
  return response;
}
