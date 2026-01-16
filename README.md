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

## Disclaimer

Not affiliated with npm, Inc.
