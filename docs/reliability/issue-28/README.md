# Issue #28 · WebKit RSC functional triage

**Finding: UNRESOLVED intermittent exception.** No functional navigation failure reproduced. The probe does not attribute past exceptions to canceled prefetches and no application or security change is justified by this sample.

| Surface | Browser and width | Functional checks | Network outcome |
| --- | --- | --- | --- |
| Public production `da9b1989d84869a8f79538afd32e01d1d2e4381e` | Chromium 158.0.8127.18, 320 | 15 passed | 65 RSC requests, 14 cancellations, no page or console errors |
| Same production | WebKit 27.2, 320 | 15 passed | 35 RSC requests, one other request failure, no page or console errors |
| Local Next.js production build `3062df3bcae42e0bbda65f5f65ea3b78be726f11` | Chromium 158 and WebKit 27.2, 320 and 1280 | 15 passed per engine and width | No page exceptions. Fixture console messages are recorded as other. |
| Pinned #31 Preview, `dpl_48xFquUo5UwPUYhtFencjVogmzdt` | Fresh Chromium and WebKit, 320 | Blocked at Vercel sign-in | Login redirects, no application RSC traffic |

The test uses real browser engines on Windows. It runs immediate hard navigations to Home, Package, Compare, About and Data, checks Back/Forward destinations, then follows the app's links through Package and Compare. It checks that the page's marker survives two client transitions, both charts render, chart inspection retains focus, and the CSV download succeeds. It checks for unavailable or failed load panels at destination. Production has no Home-to-Data link, so it uses a document navigation for that final step.

## Reproduction

Run `npm run build` and `node scripts/verify-webkit-navigation-local.mjs <output-directory>` with installed Playwright Chromium and WebKit. The fixture serves on loopback and uses the existing deterministic upstream mock. The WebKit fixture proxy omits only the HTTPS upgrade directive on its local response because the fixture is HTTP. It cannot proxy remote hosts. The production and protected Preview tests connect directly, without that proxy.

For a single benign external sample, use `node scripts/verify-webkit-navigation.mjs <origin> <origin> <output-directory> production`. Use only the intended public deployment. The runner emits per-engine logs and a Compare screenshot, with explicit sign-in BLOCKED for a protected deployment. It never obtains or alters authentication. The navigation probe sets temporary comparison state in its isolated browser context. It logs method, path, hashed RSC key, prefetch headers, response status, selected policy/cache headers and failure category. It excludes cookies, credentials, raw query strings and response bodies.

## Evidence and next gate

- [Public WebKit trace](production-final-webkit-320.json) and [screenshot](production-final-webkit-320-compare.png). [Chromium control](production-final-chromium-320.json).
- [Local 320 WebKit trace](fixture-webkit-320.json), [desktop trace](fixture-webkit-1280.json) and [desktop screenshot](fixture-webkit-1280-compare.png).
- [Pinned Preview WebKit sign-in trace](pinned-preview-webkit-320.json). A signed-in Chromium check has a different engine and cannot establish what authenticated WebKit did.
- [Earlier captured public access-control exceptions](https://github.com/afria85/npmtraffic/blob/80bce0fc723507e08feeceac68ed7d3fd8a812ca/docs/design/mission-8/release-readiness/webkit-network-production.json) remain unexplained. This passing sample is evidence against a deterministic release blocker, but user impact of those earlier exceptions remains unmeasured.

Manual status is NOT TESTED for actual iPhone Safari, Android touch and OS screen readers. On a real phone, load Home, open React, compare React/Vue, switch ranges, download CSV and use fast Back/Forward. Observe errors, focus, plot and downloaded filename. With NVDA, VoiceOver or TalkBack, read the header and main heading after navigation, use the chart inspector and legend, and confirm that export focus returns on Escape or dismissal. Record OS/browser version and exact deployment. Field CWV needs normal-traffic user measurements over a representative release window. No performance claim follows from this probe.
