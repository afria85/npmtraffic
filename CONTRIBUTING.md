# Contributing

Thanks for taking the time to contribute.

## Local setup

Requirements:

- Node.js (LTS recommended)
- npm

Install deps:

```bash
npm ci
```

Run dev server:

```bash
npm run dev
```

Build and lint:

```bash
npm run lint
npm run build
```

## Project conventions

- Prefer small, reviewable PRs.
- Keep UI changes consistent across light/dark themes.
- Avoid introducing new client-only dependencies unless necessary.
- Do not log sensitive data (headers, tokens) server-side.

## Reporting bugs

Include:

- URL and query params
- expected vs actual
- screenshots for UI issues
- console output (browser + server) if relevant
