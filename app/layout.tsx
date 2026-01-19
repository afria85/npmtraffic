import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { config } from "@/lib/config";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

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
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
    title: config.site.name,
    description: config.site.tagline,
  },
};

import CompareTray from "@/components/compare/CompareTray";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

const THEME_INIT_SCRIPT = `(() => {
  try {
    const key = "npmtraffic_theme";
    const saved = localStorage.getItem(key);
    const system = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const theme = (saved === "dark" || saved === "light") ? saved : system;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    // ignore
  }
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetBrainsMono.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#0b0f14" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f6f8fb" media="(prefers-color-scheme: light)" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="h-screen overflow-hidden antialiased">
        <div className="flex h-screen flex-col">
          <Header />
          <CompareTray />
          <main className="flex-1 overflow-y-auto">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
