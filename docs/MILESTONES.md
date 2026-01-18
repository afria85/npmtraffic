# Milestones

This project is intentionally small, deterministic, and "audit-first". Milestones focus on reliability, clarity, and exports that users can trust.

## Product milestones

### v0.2.x (shipping now)
- Daily download tables (single package + compare)
- Ranges: 7/14/30 and More (90/180/365)
- Cache TTL awareness and stale surfacing (no blank screens)
- Audit-grade exports (CSV/JSON + metadata)
- Excel-friendly CSV endpoints (semicolon + `sep=;`)
- Local-first events (CRUD + import/export + share payload)

### v0.3.x (UX + trust)
- Fix compare Export dropdown clipping/portal issues
- Clarify compare headers (no duplicated labels) and explain "% of total" via tooltip copy
- Consistent iconography (replace "?" caret with chevron, align actions)
- Theme toggle that defaults to system and persists choice
- Donate UX polish (visible, not pushy)

### v0.4.x (analysis)
- Minimal line chart (single + compare)
  - Tooltip: UTC date, downloads, delta, cache/stale
  - Optional MA7 toggle
  - Event overlays
- Unified Export dropdown (CSV / Excel CSV / JSON)

### v0.5+ (optional, demand-driven)
- Local snapshots/history (user-owned storage)
- Insights over time (adoption signals, change attribution)
- Optional paid add-ons if there is clear demand (never at the expense of core reliability)

## Sponsorship milestones (communication)

GitHub Sponsors tiers are designed to keep the project sustainable without paywalling core features.

- **$500/mo**: cover baseline infrastructure (hosting, caching, monitoring) and keep the site ad-free
- **$1000/mo**: reduce part-time hours to ship fixes and improvements more consistently
- **$1500/mo**: accelerate reliability work and deeper analysis features (still keeping the core free)

Notes:
- These are directional milestones for transparency, not promises or delivery dates.
- Feature prioritization remains driven by user feedback and reliability needs.
