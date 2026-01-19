import { ImageResponse } from "next/og";

export const runtime = "edge";

function clampText(value: string, max = 80) {
  const v = (value ?? "").trim();
  if (!v) return "";
  return v.length > max ? `${v.slice(0, Math.max(0, max - 3))}...` : v;
}

function parseDays(value: string | null) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 30;
  return Math.max(1, Math.min(365, Math.round(n)));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = (searchParams.get("mode") ?? "pkg").toLowerCase();
  const days = parseDays(searchParams.get("days"));

  const accent = "#5eead4";
  const bg = "#0b0f14";
  const fg = "#e6edf3";
  const muted = "#94a3b8";

  if (mode === "compare") {
    const raw = searchParams.get("pkgs") ?? "";
    const pkgs = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);

    const title = pkgs.length ? pkgs.join(" vs ") : "Compare npm packages";

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            background: bg,
            padding: 72,
            justifyContent: "space-between",
          }}
        >
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
                  color: accent,
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: -0.5,
                }}
              >
                t
              </div>
              <div style={{ color: fg, fontSize: 26, fontWeight: 700 }}>npmtraffic</div>
            </div>
            <div style={{ color: muted, fontSize: 18 }}>{days} days</div>
          </div>

          <div style={{ marginTop: 36 }}>
            <div style={{ color: muted, fontSize: 18, letterSpacing: 3, textTransform: "uppercase" }}>Compare</div>
            <div
              style={{
                marginTop: 14,
                color: fg,
                fontSize: 64,
                fontWeight: 800,
                letterSpacing: -2,
                lineHeight: 1.05,
              }}
            >
              {clampText(title, 120)}
            </div>
            <div style={{ marginTop: 18, color: muted, fontSize: 26 }}>
              Daily downloads · deltas · export-ready
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ color: muted, fontSize: 18 }}>npmtraffic.com</div>
            <div style={{ color: accent, fontSize: 18, fontWeight: 700 }}>Not affiliated with npm, Inc.</div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const pkg = clampText(searchParams.get("pkg") ?? "", 80) || "npm package";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: bg,
          padding: 72,
          justifyContent: "space-between",
        }}
      >
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
                color: accent,
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: -0.5,
              }}
            >
              t
            </div>
            <div style={{ color: fg, fontSize: 26, fontWeight: 700 }}>npmtraffic</div>
          </div>
          <div style={{ color: muted, fontSize: 18 }}>{days} days</div>
        </div>

        <div style={{ marginTop: 36 }}>
          <div style={{ color: muted, fontSize: 18, letterSpacing: 3, textTransform: "uppercase" }}>Daily downloads</div>
          <div
            style={{
              marginTop: 14,
              color: fg,
              fontSize: 74,
              fontWeight: 800,
              letterSpacing: -2.5,
              lineHeight: 1.05,
            }}
          >
            {pkg}
          </div>
          <div style={{ marginTop: 18, color: muted, fontSize: 26 }}>
            Table + chart · local event markers · audit-grade exports
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ color: muted, fontSize: 18 }}>npmtraffic.com</div>
          <div style={{ color: accent, fontSize: 18, fontWeight: 700 }}>Not affiliated with npm, Inc.</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
