# Security Policy

## Supported Versions

npmtraffic is a small, fast-moving project. Only the latest commit on the default branch is supported.

## Reporting a Vulnerability

Please report security issues privately.

1. Open a GitHub Security Advisory (preferred), or email the maintainer.
2. Include a minimal reproduction, affected URL/path, and impact assessment.
3. Do not open a public issue for vulnerabilities.

We aim to acknowledge reports within a few days and will coordinate a fix and disclosure timeline.

## Scope Notes

- The public site does not accept user authentication.
- Event data is stored locally in the browser (client-side).
- Server endpoints are rate limited and use caching where applicable.

## Operational boundaries

Only Vercel's platform-managed `x-vercel-forwarded-for` is used as client identity
when `VERCEL=1`; other forwarded headers are ignored. Verify ingress rewriting
before deploying behind another proxy. Optional Upstash limiting uses atomic EVAL
and fails closed on errors. Keep production cron authorization configured.
See `docs/engineering-audit-2026-11.md` for remaining development-only advisories
and staging verification requirements. Smoke fixtures are test-process preloads,
not application features or production environment settings.
