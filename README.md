# npmtraffic

npmtraffic is a mobile-first web app that shows daily npm package download traffic in a GitHub-style table view. It includes search, compare, and CSV export for npm packages, and uses npm registry APIs for data. It is not affiliated with npm.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Search examples

- Search for `react` and press Enter to open `/p/react?days=30`.
- Search for `logshield-cli` to validate a less common package.
- Compare packages with `/compare?packages=react,vue,logshield-cli&days=30`.
- Export CSV from `/api/v1/package/react/daily.csv?days=30`.

## Deploy to Vercel + npmtraffic.com

1. Import this repo in Vercel.
2. Set the `BASE_URL` environment variable to `https://npmtraffic.com` in production (optional but recommended for canonical URLs).
3. Add the custom domain `npmtraffic.com` in Vercel and follow DNS instructions.
4. Deploy.

## Data source

Download counts are sourced from `api.npmjs.org`.

## Ops

- `/status` shows the latest build info (commit + environment), the most recent traffic success/error timestamps, and the last recorded cache status or stale indicator. It will always render even if no health data is recorded yet.
- `/api/cron/prewarm` triggers warming the traffic cache for the curated package list (or a custom comma-separated `packages` parameter) across 7/14/30-day ranges. Call it via `curl https://npmtraffic.com/api/cron/prewarm` or with `?packages=react,vue&days=7,14`. The endpoint always returns a `200` JSON summary with counts, failures, and duration.

## Disclaimer

Not affiliated with npm, Inc.
