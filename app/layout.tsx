import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { config } from "@/lib/config";
import { getProjectGithubUrl } from "@/lib/donate";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: {
    default: config.site.name,
    template: `%s | ${config.site.name}`,
  },
  description: config.site.tagline,
  metadataBase: new URL(config.site.url),
  openGraph: {
    title: config.site.name,
    description: config.site.tagline,
    url: config.site.url,
    type: "website",
    images: [
      {
        url: `${config.site.url}/og.png`, 
        width: 1200, 
        height: 630,
        alt: "npmtraffic logo",
      },
      {
        url: `${config.site.url}/og-fallback.png`,
        width: 1200,
        height: 630,
        alt: "npmtraffic",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png", "/og-fallback.png"],
    title: config.site.name,
    description: config.site.tagline,
  },
};

import CompareTrayGate from "@/components/compare/CompareTrayGate";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

const THEME_INIT_SCRIPT = `(() => {
    const key = "npmtraffic_theme";
    let cookie = null;
    let saved = null;
    try {
      const match = document.cookie.match(new RegExp('(?:^|; )' + key + '=([^;]+)'));
      cookie = match ? decodeURIComponent(match[1]) : null;
    } catch {}
    try { saved = localStorage.getItem(key); } catch {}
    const system = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const theme = (cookie === "dark" || cookie === "light")
      ? cookie
      : (saved === "dark" || saved === "light")
        ? saved
        : system;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        {/* Apply the theme as the document is parsed, before client bundles load. */}
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#0b0f14" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f6f8fb" media="(prefers-color-scheme: light)" />
      </head>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <div
          className="flex min-h-screen flex-col"
          style={{ paddingBottom: "var(--compare-tray-space, 0px)" }}
        >
          <Header />
          <Suspense fallback={null}>
            <CompareTrayGate />
          </Suspense>
          <div className="flex-1">{children}</div>
          <Footer projectGithubUrl={getProjectGithubUrl()} />
        </div>
        <Analytics />
      </body>
    </html>
  );
}
