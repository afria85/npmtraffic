import type { CSSProperties, ReactNode } from "react";
import type { buildOgComparisonStats, buildOgPackageStats } from "@/lib/og-stats";

const WIDTH = 1200;
const HEIGHT = 630;

// Brand palette (aligned with globals.css: --brand-500)
const ACCENT = "#06b6d4";
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
// max-age=0 keeps browsers from caching aggressively, while s-maxage enables CDN caching.
const CACHE_CONTROL = "public, max-age=0, s-maxage=900, stale-while-revalidate=86400";

function clampText(value: string, max = 80) {
  const v = (value ?? "").trim();
  if (!v) return "";
  return v.length > max ? `${v.slice(0, Math.max(0, max - 3))}…` : v;
}

function formatNumber(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
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

type PkgStats = ReturnType<typeof buildOgPackageStats>;
type CompareStats = ReturnType<typeof buildOgComparisonStats>;

type OgImageOptions =
  | { mode: "home" }
  | { mode: "pkg"; pkg: string; days: number; stats?: PkgStats }
  | { mode: "compare"; pkgs: string[]; days: number; stats?: CompareStats };

/**
 * BrandMark - npmtraffic logo
 * Matches public/brand-mark.svg exactly:
 * - Left pillar: #06b6d4 (ACCENT)
 * - Middle diagonal: #22d3ee
 * - Right pillar: #0891b2
 */
function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      <rect x="0" y="0" width="14" height="48" rx="3" fill="#06b6d4" />
      <polygon points="16,0 28,0 32,28 20,28" fill="#22d3ee" />
      <rect x="34" y="0" width="14" height="48" rx="3" fill="#0891b2" />
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

function StatCell({
  label,
  value,
  sub,
  accent,
  children,
  valueStyle,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  children?: ReactNode;
  valueStyle?: CSSProperties;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: "18px 18px",
        borderRadius: 18,
        border: `1px solid ${BORDER}`,
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ color: MUTED, fontSize: 14, letterSpacing: 2.2, textTransform: "uppercase" }}>{label}</div>
        <div
          style={{
            marginTop: 10,
            color: accent ?? FG,
            fontSize: 42,
            fontWeight: 900,
            letterSpacing: -1.6,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            ...valueStyle,
          }}
        >
          {value}
        </div>
        {sub ? (
          <div
            style={{
              marginTop: 8,
              color: MUTED,
              fontSize: 16,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
      {children ? <div style={{ marginTop: 14, display: "flex" }}>{children}</div> : null}
    </div>
  );
}

function Sparkline({ values, w = 520, h = 90 }: { values: (number | null)[]; w?: number; h?: number }) {
  const available = values.filter((value) => value !== null);
  const max = Math.max(1, ...available);
  const min = Math.min(...available);
  const pad = 8;

  const points = values.map((value, index) => {
    if (value === null) return null;
    const x = pad + (index * (w - pad * 2)) / Math.max(1, values.length - 1);
    const norm = (value - min) / Math.max(1, max - min);
    return { x: x.toFixed(1), y: (pad + (1 - norm) * (h - pad * 2)).toFixed(1) };
  });
  const path = points.map((point, index) => point
    ? (points[index - 1] ? "L" : "M") + point.x + "," + point.y : "").join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width={w} height={h} rx="16" fill="rgba(255,255,255,0.02)" stroke={BORDER} />
      <path
        d={path}
        fill="none"
        stroke={ACCENT}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((point, index) => point && !points[index - 1] && !points[index + 1]
        ? <circle key={index} cx={point.x} cy={point.y} r="2" fill={ACCENT} /> : null)}
    </svg>
  );
}

function Wordmark({ size = 30 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", fontSize: size, fontWeight: 900, letterSpacing: -0.8 }}>
      <span style={{ color: ACCENT }}>npm</span>
      <span style={{ color: FG }}>traffic</span>
    </div>
  );
}

function createHeader(opts: { mode: "home" } | { mode: "pkg" | "compare"; days: number }) {
  const pillText =
    opts.mode === "home" ? "Open Source" : opts.mode === "compare" ? `Compare · ${opts.days}d` : `${opts.days}d`;
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
          <Wordmark size={30} />
          <div style={{ color: MUTED, fontSize: 18 }}>Download analytics for npm</div>
        </div>
      </div>
      <Pill text={pillText} />
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

function createHomeLayout() {
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
      {createHeader({ mode: "home" })}

      <div
        style={{
          marginTop: 30,
          borderRadius: 28,
          border: `1px solid ${BORDER}`,
          background: BG_CARD,
          padding: 44,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              color: FG,
              fontSize: 70,
              fontWeight: 950,
              letterSpacing: -2.4,
              lineHeight: 0.98,
              display: "flex",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <span style={{ color: ACCENT }}>npm</span>
            <span>download analytics.</span>
          </div>
          <div style={{ color: ACCENT, fontSize: 60, fontWeight: 950, letterSpacing: -2.2, lineHeight: 0.98 }}>
            Daily data, full metadata.
          </div>
          <div style={{ marginTop: 10, color: MUTED, fontSize: 22, lineHeight: 1.35, maxWidth: 900 }}>
            UTC-anchored daily tables. Compare insights. Release context. Traceable exports.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 30 }}>
          <Pill text="Daily tables" />
          <Pill text="CSV/Excel/JSON" />
          <Pill text="Compare packages" />
          <Pill text="Release markers" />
        </div>
      </div>

      {createFooter()}
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
  const pctSub = pctIsValid ? `latest ${stats?.trendDays}d vs prior ${stats?.trendDays}d` : "comparison unavailable";

  const spark = stats?.coverage.includedDays ? stats.sparkline : undefined;
  const rangeText =
    stats?.dateRange?.start && stats?.dateRange?.end
      ? `${formatShortDate(stats.dateRange.start)} – ${formatShortDate(stats.dateRange.end)}`
      : "—";
  const trendText = pctIsValid ? (pct >= 0 ? "Up" : "Down") : "Trend";
  const trendArrow = pctIsValid ? (pct >= 0 ? "↗" : "↘") : "→";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: BG,
        padding: 48,
        paddingLeft: 64,
        paddingRight: 64,
        justifyContent: "space-between",
      }}
    >
      {createHeader({ mode: "pkg", days })}

      <div
        style={{
          marginTop: 22,
          borderRadius: 28,
          border: `1px solid ${BORDER}`,
          background: BG_CARD,
          padding: 36,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ color: MUTED, fontSize: 16, letterSpacing: 3, textTransform: "uppercase" }}>Daily downloads</div>
        <div
          style={{
            marginTop: 10,
            color: FG,
            fontSize: 68,
            fontWeight: 950,
            letterSpacing: -2.2,
            lineHeight: 1.02,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {safePkg}
        </div>
        <div style={{ marginTop: 10, color: MUTED, fontSize: 20 }}>
          {`${dateLabel ?? `${days} day window (UTC)`}${stats?.isStale ? " · cached" : ""}`}
        </div>

        {/* 4-up stat grid (matches share-preview style) */}
        <div style={{ marginTop: 24, display: "flex", gap: 14 }}>
          <StatCell label="Downloads" value={formatNumber(stats?.total)}
            sub={stats ? `${stats.coverage.includedDays}/${stats.coverage.requestedDays} available days` : "data unavailable"} />
          <StatCell label="Vs previous period" value={pctText} sub={pctSub} accent={pctAccent} />
          <StatCell
            label="Date range"
            value={rangeText}
            sub="UTC"
            valueStyle={{ fontSize: 22, letterSpacing: -0.4 }}
          />
          <StatCell
            label="Trend"
            value={`${trendArrow} ${trendText}`}
            sub={spark ? "daily downloads" : "sparkline unavailable"}
            accent={pctIsValid ? (pct >= 0 ? SUCCESS : DANGER) : FG}
          >
            {spark ? <Sparkline values={spark} w={200} h={58} /> : null}
          </StatCell>
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
      ? `${formatShortDate(stats.dateRange.start)} – ${formatShortDate(stats.dateRange.end)} UTC · ${stats.coverage.includedDays}/${stats.coverage.requestedDays} shared days${stats.isStale ? " · cached" : ""}`
      : undefined;

  const tabs = pkgs.slice(0, 5);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: BG,
        padding: 48,
        justifyContent: "space-between",
      }}
    >
      {createHeader({ mode: "compare", days })}

        <div
          style={{
            marginTop: 20,
            flex: 1,
            borderRadius: 24,
            border: `1px solid ${BORDER}`,
            background: BG_CARD,
            padding: 26,
            display: "flex",
            flexDirection: "column",
          }}
        >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: MUTED, fontSize: 16, letterSpacing: 3, textTransform: "uppercase" }}>Compare</div>
            <div style={{ marginTop: 8, color: FG, fontSize: 46, fontWeight: 950, letterSpacing: -1.6 }}>Daily downloads</div>
          </div>
          {dateLabel ? <div style={{ color: MUTED, fontSize: 16 }}>{dateLabel}</div> : null}
        </div>

        {/* Tab-style package pills (share-preview friendly) */}
        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
          {tabs.map((pkg, i) => (
            <div
              key={pkg}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: `1px solid ${i === 0 ? CHART_COLORS[0] : BORDER}`,
                background: i === 0 ? `${CHART_COLORS[0]}1f` : "rgba(255,255,255,0.03)",
                color: i === 0 ? CHART_COLORS[0] : FG,
                fontSize: 20,
                fontWeight: 800,
                maxWidth: 320,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {clampText(pkg, 28)}
            </div>
          ))}
        </div>

        {/* Stats grid */}
        {hasStats ? (
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: `1px solid ${BORDER}`,
              display: "flex",
              gap: 14,
            }}
          >
            {stats.packages.slice(0, 3).map((pkg, i) => (
              <div
                key={pkg.name}
                style={{
                  flex: 1,
                  padding: "16px 16px",
                  borderRadius: 18,
                  border: `1px solid ${BORDER}`,
                  background: "rgba(255,255,255,0.02)",
                  borderTop: `4px solid ${CHART_COLORS[i % CHART_COLORS.length]}`,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    color: MUTED,
                    fontSize: 14,
                    letterSpacing: 2.0,
                    textTransform: "uppercase",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {clampText(pkg.name, 26)}
                </div>
                <div style={{ marginTop: 8, color: FG, fontSize: 40, fontWeight: 950, letterSpacing: -1.5 }}>
                  {formatNumber(pkg.total)}
                </div>
                <div style={{ marginTop: 8, color: MUTED, fontSize: 16 }}>total downloads</div>
                <div style={{ marginTop: 8, color: CHART_COLORS[i % CHART_COLORS.length], fontSize: 16, fontWeight: 800 }}>
                  {pkg.share === null ? "Share unavailable" : `${pkg.share.toFixed(1)}% share`}
                </div>
              </div>
            ))}

            {stats.packages.length > 3 && (
              <div
                key="_more"
                style={{
                  flex: 1,
                  padding: "16px 16px",
                  borderRadius: 18,
                  border: `1px solid ${BORDER}`,
                  background: "rgba(255,255,255,0.02)",
                  borderTop: `4px solid ${ACCENT}`,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div style={{ color: MUTED, fontSize: 14, letterSpacing: 2.0, textTransform: "uppercase" }}>
                  also compared
                </div>
                <div style={{ marginTop: 8, color: FG, fontSize: 50, fontWeight: 950, letterSpacing: -1.8 }}>
                  {`+${stats.packages.length - 3}`}
                </div>
                <div style={{ marginTop: 8, color: MUTED, fontSize: 18 }}>more packages</div>
                <div style={{ marginTop: 8, color: ACCENT, fontSize: 16, fontWeight: 800 }}>up to 5 total</div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              marginTop: 22,
              paddingTop: 22,
              borderTop: `1px solid ${BORDER}`,
              color: MUTED,
              fontSize: 20,
            }}
          >
            Side-by-side daily downloads · Aligned date ranges · Reproducible exports
          </div>
        )}
      </div>

      {createFooter()}
    </div>
  );
}

export async function buildOgImageResponse(options: OgImageOptions) {
  const element =
    options.mode === "home"
      ? createHomeLayout()
      : options.mode === "compare"
        ? createCompareLayout(options.pkgs, options.days, options.stats)
        : createPackageLayout(options.pkg, options.days, options.stats);

  const { ImageResponse } = await import("next/og");
  return new ImageResponse(element, {
    width: WIDTH,
    height: HEIGHT,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}
