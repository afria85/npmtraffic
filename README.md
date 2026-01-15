# npmtraffic

npmtraffic is a mobile-first web app that shows daily npm package download traffic in a GitHub-style table view. It uses the npm downloads API for data and is not affiliated with npm.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel + npmtraffic.com

1. Import this repo in Vercel.
2. Set the `BASE_URL` environment variable to `https://npmtraffic.com` in production (optional but recommended for canonical URLs).
3. Add the custom domain `npmtraffic.com` in Vercel and follow DNS instructions.
4. Deploy.

## Data source

Download counts are sourced from `api.npmjs.org`.

## Disclaimer

Not affiliated with npm, Inc.
