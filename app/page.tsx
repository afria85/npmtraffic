import type { Metadata } from "next";
import Link from "next/link";
import { POPULAR_PACKAGES } from "@/lib/constants";
import { getBaseUrl } from "@/lib/base-url";
import { config } from "@/lib/config";
import { homepageJsonLd } from "@/lib/jsonld";
import SearchBox from "@/components/SearchBox";
export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const ogImage = `${baseUrl}/og.png`;
  const fallbackOgImage = `${baseUrl}/og-fallback.png`;

  return {
    title: "npm Download Trends & Comparisons | npmtraffic",
    description: config.site.tagline,
    alternates: {
      canonical: `${baseUrl}/`,
    },
    openGraph: {
      type: "website",
      siteName: "npmtraffic",
      title: "npm Download Trends & Comparisons | npmtraffic",
      description: config.site.tagline,
      url: `${baseUrl}/`,
      images: [{ 
        url: ogImage, 
        alt: "npmtraffic - Daily npm download analytics",
        width: 1200,
        height: 630,
        type: "image/png",
      }, {
        url: fallbackOgImage,
        alt: "npmtraffic",
        width: 1200,
        height: 630,
        type: "image/png",
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: "npm Download Trends & Comparisons | npmtraffic",
      description: config.site.tagline,
      images: [{
        url: ogImage,
        alt: "npmtraffic - Daily npm download analytics",
      }, {
        url: fallbackOgImage,
        alt: "npmtraffic",
      }],
    },
  };
}

export default async function Home() {
  const baseUrl = await getBaseUrl();
  const jsonLd = homepageJsonLd(baseUrl);
  const jsonLdText = JSON.stringify(jsonLd).replace(/</g, "\\u003c");

  return (
    <main className="observatory-page observatory-home">
      <div className="observatory-home-grid">
        <section aria-labelledby="find-package" className="min-w-0">
          <h1 id="find-package" className="observatory-home-title">Explore <span className="text-[var(--accent)]">npm</span> downloads</h1>
          <p className="observatory-home-intro">
            Look up a package or compare up to five. Inspect daily downloads, coverage, and release dates on the same UTC timeline.
          </p>
          <SearchBox className="mt-5 w-full max-w-xl" />
          <nav aria-label="Package analysis" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link className="observatory-text-link" href="/compare">Compare packages</Link>
            <Link className="observatory-text-link" href="/data">Data and exports</Link>
          </nav>
          <div className="observatory-package-index">
            <h2 className="observatory-section-title">Open a package</h2>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {POPULAR_PACKAGES.slice(0, 12).map((pkg) => (
                <li key={pkg}>
                  <Link href={`/p/${encodeURIComponent(pkg)}?days=30`} className="observatory-text-link">
                    {pkg}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="observation-rules" className="observatory-method">
          <h2 id="observation-rules" className="observatory-section-title">How to read an observation</h2>
          <p className="mt-2 text-sm text-[var(--foreground-secondary)]">
            Dates end at yesterday UTC. Coverage shows how many requested days have usable counts.
          </p>
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr><th scope="col">Observation</th><th scope="col">In totals</th></tr>
            </thead>
            <tbody>
              <tr><th scope="row">Verified count</th><td>Included, even when zero</td></tr>
              <tr><th scope="row">Missing</th><td>Excluded</td></tr>
              <tr><th scope="row">Unverified</th><td>Excluded</td></tr>
            </tbody>
          </table>
          <p className="mt-3 text-sm text-[var(--foreground-secondary)]">
            Comparisons count only the days available for every selected package.
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 text-sm">
            <Link className="observatory-text-link" href="/transparency">Read the methodology</Link>
            <Link className="observatory-text-link" href="/about">About npmtraffic</Link>
          </div>
        </section>
      </div>

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdText }}
      />
    </main>
  );
}
