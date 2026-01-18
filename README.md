# npmtraffic

GitHub-style daily npm download history with audit-grade exports.

[![CI](https://github.com/afria85/npmtraffic/actions/workflows/ci.yml/badge.svg)](https://github.com/afria85/npmtraffic/actions/workflows/ci.yml)
[![Sponsor](https://img.shields.io/badge/sponsor-GitHub%20Sponsors-0ea5e9?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/afria85)

npmtraffic is a mobile-first web app that shows **daily npm package downloads** in a GitHub-style table view. It supports search, compare, and exports (CSV/JSON), and surfaces cache freshness + staleness so users can trust what they are seeing.

> Not affiliated with npm, Inc. Data from `api.npmjs.org`.

## What you get

- **Daily tables** (single package + compare)
- **Ranges**: 7/14/30 + More (90/180/365)
- **Cache TTL awareness** + stale surfacing (no blank screens)
- **Audit-grade exports**
  - CSV + JSON include metadata (`from/to`, UTC timestamps, source, cache status, request_id)
  - Deterministic filenames and `Content-Disposition: attachment` for reliable downloads
  - Excel-friendly CSV endpoints (semicolon + `sep=;`)
- **Events**: local-first markers (CRUD + import/export + share payload)

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Examples

- Package: `/p/react?days=30`
- Compare: `/compare?packages=react,vue,logshield-cli&days=30`
- Export CSV: `/api/v1/package/react/daily.csv?days=30`
- Export JSON: `/api/v1/package/react/daily.json?days=30`

## Environment

No configuration is required for local dev.

For production and external links, copy `.env.example` to `.env.local` (or configure in Vercel):

- `BASE_URL` (recommended in production)
- `NEXT_PUBLIC_PROJECT_GITHUB` (shows "Star on GitHub" link)
- `NEXT_PUBLIC_DONATE_GITHUB_SPONSORS` / `NEXT_PUBLIC_DONATE_PAYPAL` (enables `/donate` and footer donate buttons)

More details: `docs/ENVIRONMENT.md`.

## Deploy

### Vercel + npmtraffic.com

1. Import the repo in Vercel.
2. Set `BASE_URL=https://npmtraffic.com` (recommended).
3. Add custom domain `npmtraffic.com` and follow DNS instructions.
4. Deploy.

## Sponsorship

Sponsorship is optional. It helps keep npmtraffic **fast, reliable, and ad-free** (hosting, caching reliability, monitoring, maintenance).

- GitHub Sponsors: `https://github.com/sponsors/afria85`
- In-app: `/donate` (enabled when donation env vars are set)

See: `docs/SPONSORSHIP.md`.

## Roadmap and milestones

- Website: `/roadmap`
- Repo milestones: `docs/MILESTONES.md`

## Ops

- `/status` shows build info and recent health signals.
- `/api/cron/prewarm` warms the traffic cache for curated packages (or custom `packages=`) across ranges.

## Production verification checklist

- **URLs**: `/`, `/p/logshield-cli?days=14`, `/p/react?days=14`, `/compare?packages=react,vue&days=14`, `/donate`, `/status`, `/sitemap.xml`, `/robots.txt`.
- **Expected UI**: tables show totals and freshness, stale banners appear on upstream failures, copy/export actions work, donate links render when configured.
- **Failure modes**: upstream `401/429/5xx` should never produce blank screens—show typed errors or stale indicators.

## License

No license has been declared yet. If you plan to open-source npmtraffic, add a LICENSE file and update this section.
