# Environment Variables

npmtraffic supports a small set of environment variables for canonical URLs, external links, and donation channels.

## Required

None. The app runs locally without configuration.

## Recommended (production)

### `BASE_URL`
Used for canonical URLs, OpenGraph/Twitter images, and sitemap URLs.

Example:

```
BASE_URL=https://npmtraffic.com
```

## Optional (UI links)

### `NEXT_PUBLIC_PROJECT_GITHUB`
If set, npmtraffic shows a "Star on GitHub" link in the footer.

Example:

```
NEXT_PUBLIC_PROJECT_GITHUB=https://github.com/afria85/npmtraffic
```

## Optional (donation channels)

When any donation link is set, npmtraffic will:
- show a **Donate** link in the header (to `/donate`)
- render donation buttons on `/donate`
- render donation buttons in the footer "Support npmtraffic" section

### `NEXT_PUBLIC_DONATE_GITHUB_SPONSORS`
GitHub Sponsors URL.

Example:

```
NEXT_PUBLIC_DONATE_GITHUB_SPONSORS=https://github.com/sponsors/afria85
```

### `NEXT_PUBLIC_DONATE_PAYPAL`
PayPal donation URL.

### `NEXT_PUBLIC_DONATE_KOFI` / `NEXT_PUBLIC_DONATE_BMAC`
Alternative donation providers. Leave empty unless you actively use them.

## Local development

Create a `.env.local` file (not committed) based on `.env.example`.
