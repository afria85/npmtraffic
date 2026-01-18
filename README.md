# npmtraffic

GitHub-style daily npm download history: fast tables, compare views, and audit-grade exports.

> Not affiliated with npm, Inc. Data sourced from `api.npmjs.org`.

## Badges

- CI (GitHub Actions): ![CI](https://github.com/afria85/npmtraffic/actions/workflows/ci.yml/badge.svg)
- Sponsors: ![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-Support-ff69b4)

## Features

- **Daily history table** (GitHub-style) for npm package downloads.
- **Compare view** across multiple packages with day-by-day downloads and deltas.
- **Export, audit-grade**:
  - CSV and JSON exports include metadata (`from/to`, `generated_at`, cache status, stale info, request id).
  - Deterministic filenames + `Content-Disposition: attachment`.
  - Excel-friendly CSV endpoints using `;` delimiter.
- **Ranges**: 7/14/30 with a “More” menu for 90/180/365 (UTC-aligned).
- **Local-first event markers** (create/update/delete) and shareable compare payloads.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

See `.env.example`. The most relevant are:

- `BASE_URL` (recommended for canonical URLs in production)
- `NEXT_PUBLIC_PROJECT_GITHUB` (for the “Star on GitHub” link)
- `NEXT_PUBLIC_DONATE_GITHUB_SPONSORS` / PayPal / etc. (for `/donate` + footer buttons)

## Deploy (Vercel)

1. Import the repo in Vercel.
2. Set `BASE_URL` to your public origin (e.g. `https://npmtraffic.com`).
3. Add a custom domain and follow DNS instructions.

## Ops endpoints

- `/status` shows build info and the latest traffic/cache health signals.
- `/api/cron/prewarm` warms the traffic cache for curated packages (or custom `packages=` and `days=`).

## Sponsorship

If npmtraffic is useful, sponsorship helps fund:

- Hosting & bandwidth
- Monitoring and cache reliability
- Maintenance and UX improvements

Core features stay free. Sponsors help keep npmtraffic fast, reliable, and ad-free.

## License

No license file is included in this repo snapshot. If you want npmtraffic to be open source, add a LICENSE (e.g. MIT) and update this section accordingly.
