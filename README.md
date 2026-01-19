# npmtraffic

[![CI](https://github.com/afria85/npmtraffic/actions/workflows/ci.yml/badge.svg)](https://github.com/afria85/npmtraffic/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

Mobile-first web app for **GitHub-style daily npm download history** — including **search**, **compare tables**, and **audit-grade exports** (CSV/JSON).  
Not affiliated with npm, Inc.

- Website: https://npmtraffic.com

---

## What you get

- **Daily download table** (GitHub-style) with day-to-day deltas
- **Compare** multiple packages in a single view
- **Export**:
  - CSV (`.csv`)
  - Excel-friendly CSV (`.excel.csv`, delimiter `;` + `sep=;`)
  - JSON (`.json`) with **audit metadata** (time range, generated_at, cache/freshness, request_id, etc.)
- **Ranges**: 7/14/30 + “More” (90/180/365) with consistent validation/labeling
- **Events / markers** (local-first): add/edit/delete, import/export, and share via URL payload (capped)
- **Resilience**: cache-aware freshness/stale indicators; upstream errors should not blank the UI

---

## Data source

Download counts are fetched from the public npm downloads API (`api.npmjs.org`).  
Numbers reflect npm’s reported download metrics and their limitations.

---

## API endpoints

### Package daily
- JSON: `/api/v1/package/:name/daily.json?days=30`
- CSV: `/api/v1/package/:name/daily.csv?days=30`
- Excel CSV: `/api/v1/package/:name/daily.excel.csv?days=30`

### Compare
- JSON: `/api/v1/compare.json?packages=react,vue&days=30`
- CSV: `/api/v1/compare.csv?packages=react,vue&days=30`
- Excel CSV: `/api/v1/compare.excel.csv?packages=react,vue&days=30`

### Search & validation
- Search: `/api/v1/search?q=react`
- Exists check: `/api/v1/validate/:name/exists`

---

## Operational endpoints

- Status page: `/status`  
  Shows build info and recent cache/traffic health signals (when available).

- Cache prewarm: `/api/cron/prewarm`  
  Warms cache for curated packages (or pass custom `packages` and `days`).
  Example:
  - `/api/cron/prewarm?packages=react,vue&days=7,14,30`

---

## Local development

### Requirements
- Node.js 20+

### Install & run
```bash
npm install
npm run dev
```

Open http://localhost:3000

### Tests & quality gates
```bash
npm test
npm run lint
npm run build
```

---

## Deployment

This project is designed to deploy cleanly to Vercel.

1. Import the repo in Vercel
2. (Optional) set `BASE_URL` to your production URL for canonical links
3. Attach your domain and deploy

---

## Security & privacy notes

- No authentication is required for core usage.
- Inputs from query params are validated/normalized.
- Export endpoints include audit metadata for traceability (range, timestamps, cache/freshness, request_id).

If you find a security issue, please open a GitHub issue with reproduction steps (avoid posting sensitive data).

---

## Support

If npmtraffic is useful, consider supporting ongoing maintenance:
- GitHub Sponsors: https://github.com/sponsors/afria85
- PayPal: see `/donate`

Starring the repo and filing high-quality bug reports also helps.

---

## Disclaimer

Not affiliated with npm, Inc. Data sourced from `api.npmjs.org`.

---

## License

Apache-2.0 — see [LICENSE](LICENSE).
