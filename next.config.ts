import type { NextConfig } from "next";

function buildCsp() {
  // Pragmatic CSP: prevents common injection classes while remaining compatible with Next.js.
  // If you later remove all inline scripts, you can tighten this by switching to nonces.
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    // Next.js requires inline styles for some runtime-injected CSS.
    "style-src 'self' 'unsafe-inline'",
    // Next.js may rely on eval in dev; keep it for compatibility.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.npmjs.org https://registry.npmjs.org",
    "upgrade-insecure-requests",
  ];
  return directives.join("; ");
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://localhost:3000", "http://192.168.0.48:3000"],
  async headers() {
    const csp = buildCsp();
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
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
