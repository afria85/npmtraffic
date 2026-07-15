# npmtraffic

Daily npm download analytics built for package maintainers.

[![CI](https://github.com/afria85/npmtraffic/actions/workflows/ci.yml/badge.svg)](https://github.com/afria85/npmtraffic/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)

**Live site:** [npmtraffic.com](https://npmtraffic.com)

## Overview

npmtraffic helps package maintainers inspect npm download changes with daily precision. It pulls from npm's public APIs, normalizes ranges to UTC reporting windows, adds release/event context, and exports traceable datasets for reproducible analysis.

The project intentionally avoids accounts, paid tiers, and dashboard-heavy tracking. Event annotations stay local by default and are shared only when a user explicitly copies a URL with embedded event data.

## Features

- **UTC daily tables** - date-by-date downloads with deltas, MA3/MA7, and MAD-based outlier signals.
- **Package insights** - latest trend, peak day, active rate, consistency, and strongest outlier summaries.
- **Package comparison** - compare 2-5 packages with aligned ranges, shares, leaders, fastest movers, and closest-race context.
- **Release and event context** - import npm publish markers, add local notes, and show markers on charts and tables.
- **Deterministic exports** - CSV, Excel-friendly CSV, JSON, chart SVG, and chart PNG exports with metadata where relevant.
- **Stale-aware reliability** - cache status, stale warnings, retry controls, and status/transparency pages for operational context.
- **Privacy-conscious telemetry** - aggregate Vercel Web Analytics only; no user accounts, ad pixels, or profiling.

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) App Router
- **UI:** React 19, Tailwind CSS 4, custom SVG charts
- **Language:** TypeScript 5
- **Runtime/deploy:** Vercel with Next.js server routes and CDN caching
- **Data sources:** `api.npmjs.org` for downloads, `registry.npmjs.org` for package metadata, search, dist-tags, and release markers

## Requirements

- Node.js 24 recommended. The CI workflow runs on Node 24.
- Node.js >=20.19 is supported by the current dependency set.
- npm 10+

## Local Development

```bash
git clone https://github.com/afria85/npmtraffic.git
cd npmtraffic
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Next.js dev server |
| `npm test` | Run the Node test suite |
| `npm run lint` | Run ESLint |
| `npm run build` | Build the production app |
| `npm start` | Start the production build locally |

## Configuration

See [.env.example](.env.example) for optional environment variables.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SITE_URL`, `BASE_URL`, `SITE_URL` | Canonical URL and OG metadata generation outside Vercel |
| `NEXT_PUBLIC_PROJECT_GITHUB` | Header/footer repository link |
| `NEXT_PUBLIC_DONATE_*` | Optional donation links shown on `/donate` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Optional distributed rate limiting |
| `CRON_SECRET` | Required in production for `/api/cron/prewarm` authorization |
| `CSP_REPORT_ONLY=1` | Emit stricter CSP in report-only mode |
| `NPMTRAFFIC_TEST_UPSTREAM_FAIL` | Test helper for simulated upstream failures |

Application defaults live in [lib/config.ts](lib/config.ts), including cache TTLs and the compare package limit.

## Public API

Supported ranges are `7`, `14`, `30`, `90`, `180`, and `365` days. Ranges end at yesterday UTC to match npm's reporting lag.

| Endpoint | Description |
| --- | --- |
| `/api/v1/package/{name}/daily.json?days=30` | Daily package downloads with range, totals, derived metrics, and export metadata |
| `/api/v1/package/{name}/daily.csv?days=30` | CSV export with metadata comments |
| `/api/v1/package/{name}/daily.excel.csv?days=30` | Semicolon-delimited spreadsheet CSV |
| `/api/v1/compare.json?packages=react,vue&days=30` | Compare totals, shares, aligned daily values, deltas, and metadata |
| `/api/v1/compare.csv?packages=react,vue&days=30` | Wide compare CSV |
| `/api/v1/compare.excel.csv?packages=react,vue&days=30` | Spreadsheet-friendly compare CSV |
| `/api/v1/search?q=react&limit=10` | npm search proxy used by package search controls |
| `/api/v1/validate/{name}/exists` | Package existence check |

Examples:

```bash
curl "https://npmtraffic.com/api/v1/package/react/daily.json?days=30"
curl "https://npmtraffic.com/api/v1/compare.json?packages=react,vue&days=30"
```

## Data Behavior

- Download counts come from `api.npmjs.org` and represent total downloads, not unique users.
- Search, repository links, dist-tags, and release markers come from `registry.npmjs.org`.
- Short traffic windows cache for 15 minutes; longer traffic windows cache for 12 hours.
- Stale traffic can be served for up to 24 hours when npm is unavailable.
- Successful data responses are CDN-cacheable with `Cache-Control`; invalid requests and errors are not cached.
- Status health is runtime-local and intentionally not a historical uptime monitor.

## Project Structure

```text
npmtraffic/
├── app/                # Next.js app routes and API routes
│   ├── p/[name]/       # Package detail pages
│   ├── compare/        # Package comparison
│   └── api/            # Public API, OG image, cron routes
├── components/         # React components
│   ├── charts/         # Chart helpers
│   ├── compare/        # Compare UI
│   └── package/        # Package detail UI
├── lib/                # Data fetching, caching, exports, validation, business logic
├── public/             # Static assets
└── tests/              # Node test suite
```

## Quality

Before pushing changes, run:

```bash
npm test
npm run lint
npm run build
```

The GitHub Actions CI workflow runs install, tests, lint, and build on Node 24.

## Privacy

- No accounts, sign-in, user profiles, or paid dashboard tier.
- Event markers are stored in browser storage by default.
- Event URL sharing is opt-in and embeds the shared payload in the copied URL.
- Theme preference uses first-party browser storage.
- Vercel Web Analytics is used for aggregate usage measurement without ad pixels or cross-site tracking cookies.

## Roadmap

See [npmtraffic.com/roadmap](https://npmtraffic.com/roadmap) for current shipped items, near-term work, and longer-term ideas.

## Support

- **Documentation:** [npmtraffic.com/about](https://npmtraffic.com/about)
- **Data notes:** [npmtraffic.com/data](https://npmtraffic.com/data)
- **Status:** [npmtraffic.com/status](https://npmtraffic.com/status)
- **Issues:** [GitHub Issues](https://github.com/afria85/npmtraffic/issues)
- **Optional support:** [npmtraffic.com/donate](https://npmtraffic.com/donate)

## License

Apache License 2.0. See [LICENSE](LICENSE).

## Acknowledgments

- Data provided by npm's public APIs.
- Hosted on [Vercel](https://vercel.com/).

---

npmtraffic is not affiliated with npm, Inc.
