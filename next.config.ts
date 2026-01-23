import type { NextConfig } from "next";

function buildCsp(options?: { strict?: boolean }) {
  const isProd = process.env.NODE_ENV === "production";
  const strict = Boolean(options?.strict);

  // Script policy: avoid unsafe-inline in production. Theme init runs from /public/theme-init.js.
  const scriptSrc = ["'self'"];
  // Next.js dev tooling may require eval; avoid it in production and in strict mode.
  if (!isProd && !strict) scriptSrc.push("'unsafe-eval'");

  // Style policy: Tailwind produces external CSS, but inline styles may still appear (e.g. SVG, charts).
  const styleSrc = ["'self'", "'unsafe-inline'"];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    `style-src ${styleSrc.join(" ")}`,
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.npmjs.org https://registry.npmjs.org",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    // Avoid mixed-content warnings in production.
    isProd ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");
}


const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://localhost:3000", "http://192.168.0.48:3000"],
  async headers() {
    const csp = buildCsp();
    const reportOnly = process.env.CSP_REPORT_ONLY === "1";
    const reportOnlyCsp = reportOnly ? buildCsp({ strict: true }) : null;
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          ...(reportOnlyCsp
            ? [{ key: "Content-Security-Policy-Report-Only", value: reportOnlyCsp }]
            : []),
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
        ],
      },
    ];
  },
};

export default nextConfig;
