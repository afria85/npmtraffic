import { ImageResponse } from "next/og";

const WIDTH = 1200;
const HEIGHT = 630;

// Brand palette (aligned with globals.css: --brand-500)
const ACCENT = "#06b6d4";
const ACCENT_SOFT = "rgba(6, 182, 212, 0.14)";
const BG = "#0a0d11";
const BG_CARD = "#111418";
const FG = "#f0f4f8";
const MUTED = "#8b98ab";
const BORDER = "rgba(255, 255, 255, 0.08)";
const SUCCESS = "#34d399";
const DANGER = "#f87171";

// Chart colors for compare mode
const CHART_COLORS = ["#06b6d4", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444"];

// OG images are marketing; keep cache short-ish.
const CACHE_CONTROL = "public, s-maxage=900, stale-while-revalidate=86400";

function clampText(value: string, max = 80) {
  const v = (value ?? "").trim();
  if (!v) return "";
  return v.length > max ? `${v.slice(0, Math.max(0, max - 3))}…` : v;
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function formatPct(pct: number): string {
  const abs = Math.abs(pct);
  if (abs >= 100) return `${pct.toFixed(0)}%`;
  if (abs >= 10) return `${pct.toFixed(1)}%`;
  return `${pct.toFixed(2)}%`;
}

function formatShortDate(isoDate: string): string {
  try {
    const d = new Date(`${isoDate}T00:00:00Z`);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  } catch {
    return isoDate;
  }
}

type PkgStats = {
  total?: number;
  percentChange?: number | null;
  sparkline?: number[];
  dateRange?: { start: string; end: string };
};

type ComparePkgStats = {
  name: string;
  total: number;
  share: number; // percentage of total
};

type CompareStats = {
  packages: ComparePkgStats[];
  dateRange?: { start: string; end: string };
};

type OgImageOptions =
  | { mode: "pkg"; pkg: string; days: number; stats?: PkgStats }
  | { mode: "compare"; pkgs: string[]; days: number; stats?: CompareStats };

/**
 * BrandMark - npmtraffic logo (OG-safe)
 *
 * Use the same geometry as the in-app mark (components/BrandMark.tsx), but keep fills solid
 * to stay compatible with OG renderers.
 */
function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
      aria-label="npmtraffic"
    >
      <rect rx="24" width="256" height="256" fill="#07090d" />
      <rect x="5.5" y="5.5" width="245" height="245" rx="20" fill="#07090d" stroke="#1a2230" strokeWidth="11" />
      <rect x="67.5" y="61.5" width="64" height="130" rx="32" transform="rotate(20 67.5 61.5)" fill="#6d34ff" />
      <polygon points="87,172 137,130 160,145 110,187" fill="#e11d48" />
      <rect x="125.5" y="71.5" width="64" height="130" rx="32" transform="rotate(20 125.5 71.5)" fill="#6d34ff" opacity="0.95" />
    </svg>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: `1px solid ${BORDER}`,
        background: "rgba(255,255,255,0.03)",
        color: MUTED,
        fontSize: 18,
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}

function StatBox({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: "18px 18px",
        borderRadius: 16,
        border: `1px solid ${BORDER}`,
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div style={{ color: MUTED, fontSize: 16, letterSpacing: 1.2, textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 8, color: accent ?? FG, fontSize: 34, fontWeight: 800, letterSpacing: -1.2 }}>
        {value}
      </div>
      {sub ? <div style={{ marginTop: 6, color: MUTED, fontSize: 18 }}>{sub}</div> : null}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const w = 520;
  const h = 90;
  const pad = 8;

  const points = values
    .map((v, i) => {
      const x = pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1);
      const norm = (v - min) / Math.max(1, max - min);
      const y = pad + (1 - norm) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width={w} height={h} rx="16" fill="rgba(255,255,255,0.02)" stroke={BORDER} />
      <polyline
        points={points}
        fill="none"
        stroke={ACCENT}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function createHeader(days: number, mode: "pkg" | "compare" = "pkg") {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 18,
            border: `1px solid ${BORDER}`,
            background: "rgba(255,255,255,0.02)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BrandMark size={40} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: FG, fontSize: 30, fontWeight: 900, letterSpacing: -0.8 }}>npmtraffic</div>
          <div style={{ color: MUTED, fontSize: 18 }}>Daily download analytics for npm</div>
        </div>
      </div>
      <Pill text={mode === "compare" ? `Compare · ${days}d` : `${days} days`} />
    </div>
  );
}

function createFooter() {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: MUTED, fontSize: 18 }}>
      <div>npmtraffic.com</div>
      <div>Not affiliated with npm, Inc.</div>
    </div>
  );
}

function createPackageLayout(pkg: string, days: number, stats?: PkgStats) {
  const safePkg = clampText(pkg || "npm package", 60);

  const dateLabel =
    stats?.dateRange?.start && stats?.dateRange?.end
      ? `${formatShortDate(stats.dateRange.start)} – ${formatShortDate(stats.dateRange.end)} (UTC)`
      : undefined;

  const pct = stats?.percentChange;
  const pctIsValid = typeof pct === "number" && Number.isFinite(pct);
  const pctAccent = !pctIsValid ? FG : pct >= 0 ? SUCCESS : DANGER;
  const pctText = !pctIsValid ? "—" : `${pct >= 0 ? "+" : ""}${formatPct(pct)}`;
  const pctSub = pctIsValid ? "vs previous period" : "previous period unavailable";

  const spark = stats?.sparkline && stats.sparkline.length >= 2 ? stats.sparkline : undefined;

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
      {createHeader(days, "pkg")}

      <div
        style={{
          marginTop: 34,
          borderRadius: 24,
          border: `1px solid ${BORDER}`,
          background: BG_CARD,
          padding: 34,
        }}
      >
        <div style={{ color: MUTED, fontSize: 18, letterSpacing: 3, textTransform: "uppercase" }}>Daily downloads</div>
        <div
          style={{
            marginTop: 12,
            color: FG,
            fontSize: 70,
            fontWeight: 900,
            letterSpacing: -2.2,
            lineHeight: 1.03,
          }}
        >
          {safePkg}
        </div>
        <div style={{ marginTop: 12, color: MUTED, fontSize: 22 }}>
          Table · chart · local event markers · reproducible exports
        </div>

        <div style={{ marginTop: 26, display: "flex", gap: 16 }}>
          <StatBox label="Total downloads" value={formatNumber(stats?.total ?? NaN)} sub={dateLabel} />
          <StatBox label="Delta" value={pctText} sub={pctSub} accent={pctAccent} />
        </div>

        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              height: 90,
              width: 90,
              borderRadius: 18,
              background: ACCENT_SOFT,
              border: `1px solid ${BORDER}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: ACCENT,
              fontSize: 38,
              fontWeight: 900,
            }}
          >
            ↗
          </div>
          {spark ? (
            <Sparkline values={spark} />
          ) : (
            <div
              style={{
                flex: 1,
                height: 90,
                borderRadius: 16,
                border: `1px solid ${BORDER}`,
                background: "rgba(255,255,255,0.02)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: MUTED,
                fontSize: 18,
              }}
            >
              Trend sparkline (last days)
            </div>
          )}
        </div>
      </div>

      {createFooter()}
    </div>
  );
}

function createCompareLayout(pkgs: string[], days: number, stats?: CompareStats) {
  const hasStats = stats && stats.packages.length > 0;
  const dateLabel =
    stats?.dateRange?.start && stats?.dateRange?.end
      ? `${formatShortDate(stats.dateRange.start)} – ${formatShortDate(stats.dateRange.end)} UTC`
      : undefined;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: BG,
        padding: 56,
        justifyContent: "space-between",
      }}
    >
      {createHeader(days, "compare")}

      <div
        style={{
          marginTop: 28,
          flex: 1,
          borderRadius: 24,
          border: `1px solid ${BORDER}`,
          background: BG_CARD,
          padding: 32,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Package tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {pkgs.slice(0, 5).map((pkg, i) => (
            <div
              key={pkg}
              style={{
                padding: "10px 18px",
                borderRadius: 12,
                border: `2px solid ${i === 0 ? CHART_COLORS[0] : BORDER}`,
                background: i === 0 ? `${CHART_COLORS[0]}18` : "rgba(255,255,255,0.03)",
                color: i === 0 ? CHART_COLORS[0] : FG,
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              {clampText(pkg, 25)}
            </div>
          ))}
        </div>

        {/* Stats grid */}
        {hasStats ? (
          <div
            style={{
              marginTop: 28,
              display: "flex",
              gap: 16,
              paddingTop: 28,
              borderTop: `1px solid ${BORDER}`,
            }}
          >
            {stats.packages.slice(0, 4).map((pkg, i) => (
              <div
                key={pkg.name}
                style={{
                  flex: 1,
                  padding: "16px 18px",
                  borderRadius: 16,
                  border: `1px solid ${BORDER}`,
                  background: "rgba(255,255,255,0.02)",
                  borderLeft: `4px solid ${CHART_COLORS[i % CHART_COLORS.length]}`,
                }}
              >
                <div
                  style={{
                    color: MUTED,
                    fontSize: 14,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {clampText(pkg.name, 18)}
                </div>
                <div style={{ marginTop: 8, color: FG, fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>
                  {formatNumber(pkg.total)}
                </div>
                <div style={{ marginTop: 6, color: CHART_COLORS[i % CHART_COLORS.length], fontSize: 16, fontWeight: 600 }}>
                  {pkg.share.toFixed(1)}% share
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              marginTop: 28,
              paddingTop: 28,
              borderTop: `1px solid ${BORDER}`,
              color: MUTED,
              fontSize: 22,
            }}
          >
            Side-by-side daily downloads · Aligned date ranges · CSV/JSON exports
          </div>
        )}

        {/* Date range footer */}
        {dateLabel && (
          <div
            style={{
              marginTop: "auto",
              paddingTop: 20,
              color: MUTED,
              fontSize: 16,
            }}
          >
            {dateLabel}
          </div>
        )}
      </div>

      {createFooter()}
    </div>
  );
}

export function buildOgImageResponse(options: OgImageOptions) {
  const response = new ImageResponse(
    options.mode === "compare"
      ? createCompareLayout(options.pkgs, options.days, options.stats)
      : createPackageLayout(options.pkg, options.days, options.stats),
    { width: WIDTH, height: HEIGHT }
  );
  response.headers.set("Content-Type", "image/png");
  response.headers.set("Cache-Control", CACHE_CONTROL);
  return response;
}
