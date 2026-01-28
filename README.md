# npmtraffic

Daily npm download analytics built for package maintainers.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)

## What is this?

npmtraffic helps you track npm package downloads with daily precision. It pulls data directly from npm's registry, displays trends with event markers, and lets you export datasets with full metadata for reproducible analysis.

**Live site:** [npmtraffic.com](https://npmtraffic.com)

## Features

- **Day-by-day tables** &ndash; Browse downloads by date, catch inflection points, and see exactly when changes happened
- **Reproducible exports** &ndash; CSV and JSON files include UTC timestamps, date ranges, and cache status for repeatable analysis
- **Event markers** &ndash; Pin releases, blog posts, or incidents to your charts to correlate with download spikes
- **Package comparison** &ndash; Compare 2-5 packages side-by-side with aligned date ranges
- **Privacy-friendly telemetry** &ndash; Minimal, aggregate analytics and performance metrics (Vercel Web Analytics + Speed Insights). No user accounts or profiling.

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, React Server Components)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Language:** [TypeScript 5](https://www.typescriptlang.org/) (strict mode)
- **Deployment:** [Vercel](https://vercel.com/) (edge functions, caching)
- **Data source:** npm registry API (`api.npmjs.org`)

## Getting Started

### Prerequisites

- Node.js 20+ 
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/afria85/npmtraffic.git
cd npmtraffic

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
npmtraffic/
├── app/                 # Next.js app directory
│   ├── p/[pkg]/         # Package detail pages
│   ├── compare/         # Package comparison
│   ├── api/             # API routes
│   └── ...
├── components/         # React components
│   ├── charts/         # Chart components
│   ├── compare/        # Comparison UI
│   └── ...
├── lib/                # Utilities and business logic
│   ├── npm-client.ts   # npm API wrapper
│   ├── cache.ts        # Caching layer
│   └── ...
├── public/             # Static assets
└── tests/              # Test files
```

## Configuration

Key settings are in `lib/config.ts`:

```typescript
export const config = {
  site: {
    name: "npmtraffic",
    tagline: "...",
    url: "https://npmtraffic.com"
  },
  cache: {
    dailyTTLSeconds: 900,        // 15 minutes
    metadataTTLSeconds: 604800,  // 7 days
  },
  limits: {
    compareMax: 5  // Max packages in comparison
  }
}
```

## API

npmtraffic uses npm's public registry API:

- Downloads: `https://api.npmjs.org/downloads/range/{start}:{end}/{package}`
- Metadata: `https://registry.npmjs.org/{package}`

See `lib/npm-client.ts` for implementation details.

## Caching Strategy

To minimize load on npm's API and keep responses fast:

1. **Daily downloads** cached for 15 minutes (enough freshness, reduces API calls)
2. **Package metadata** cached for 7 days (rarely changes)
3. **Validation results** cached for 24 hours (positive) or 1 hour (negative)

All caching happens at the Next.js level using `fetch` with `next.revalidate`.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

### Development Guidelines

- **TypeScript strict mode** &ndash; No `any` types
- **ESLint clean** &ndash; Run `npm run lint` before committing
- **Tests required** &ndash; Add tests for new features (`npm test`)
- **Responsive design** &ndash; Test on mobile, tablet, desktop
- **Accessibility** &ndash; Follow WCAG AA standards

### Reporting Issues

Found a bug or have a feature request? [Open an issue](https://github.com/afria85/npmtraffic/issues) with:

1. Clear description
2. Steps to reproduce (for bugs)
3. Expected vs actual behavior
4. Screenshots (if applicable)

## Roadmap

See [/roadmap](https://npmtraffic.com/roadmap) for planned features and improvements.

Current focus:
- Enhanced event markers with custom categories
- Historical data exports (>365 days)
- API rate limiting improvements
- Performance optimizations

## Privacy & Data

- **No user profiling** &ndash; No accounts, no user-level tracking; analytics are aggregate only
- **No cookies** &ndash; Except theme preference (localStorage)
- **Minimal analytics** &ndash; Aggregate usage + performance metrics via Vercel (no ad pixels, no user profiling)
- **GDPR compliant** &ndash; No external font loading, no tracking scripts

All data comes from npm's public API. We don't store or sell user data.

## License

This project is licensed under the Apache License 2.0 - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Data provided by [npm, Inc.](https://www.npmjs.com/)
- Charts powered by custom canvas rendering
- Hosted on [Vercel](https://vercel.com/)

## Support

- **Documentation:** [npmtraffic.com/about](https://npmtraffic.com/about)
- **Status:** [npmtraffic.com/status](https://npmtraffic.com/status)
- **Issues:** [GitHub Issues](https://github.com/afria85/npmtraffic/issues)

Optional donations help cover hosting and maintenance: [npmtraffic.com/donate](https://npmtraffic.com/donate)

---

**Note:** npmtraffic is not affiliated with npm, Inc. This is an independent project built to help package maintainers understand their download trends.
