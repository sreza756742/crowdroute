# Progress

## Current status — first implementation slice

### Phase 0: Setup

- [x] TypeScript/Vite/React project, linting, type checking, Vitest and GitHub Actions CI created.
- [x] Documentation and secret-safe `.gitignore` / `.env.example` created.
- [x] Three structured source paths assessed and recorded in `SOURCES.md`; credential-acceptance caveats are explicit.

### Phase 1: Data foundation

- [x] Zod schemas for all JSON files and a cited, capacity-null venue seed.
- [x] Ticketmaster structured-source adapter and atomic pipeline path.
- [x] Validation, deduplication and all category duration defaults with unit tests.

### Phase 2: Full pipeline and workflow

- [ ] Activate Ticketmaster and Eventfinda after owner credentials/terms approval, and approve a third structured source. Both credentialed adapters are implemented; AT HTML and inaccessible HRNZ endpoints were deliberately rejected for automation.
- [x] Confidence/review split, disabled-by-default AI provider interface and mock tests.
- [x] Twice-daily pipeline, manual trigger, commit-if-changed, direct Pages deployment, last-good-data guards and an activity-producing weekly keepalive workflow.
- [x] Generate and verify `events.xlsx`; its two data rows match the two seed JSON records.

### Phase 3: Scoring

- [x] Config-driven day scoring, clusters and 10+ fixed unit cases.

### Phase 4: Frontend

- [x] Mobile-first home, event detail, filters, About, stale state, theme switch and PWA cache implemented.
- [x] Add 390 px Playwright journeys for day/event detail, category filters, stale-data warning, all theme modes and a production-service-worker offline reload.
- [x] Lighthouse mobile: Performance 99, Accessibility 100, Best Practices 96 and SEO 100; thresholds now run in CI.

### Phase 5: Hardening and launch

- [x] Complete the launch-grade runbook for sources, incidents, Pages, secrets and data recovery.
- [x] Dependency audit and common-signature secret scan: no high/critical advisory and no secret signature found.
- [ ] Deploy and test the live Pages URL.

## Human-only launch work

- Create or confirm the GitHub repository, enable Pages via GitHub Actions, and allow Actions write access.
- Accept Ticketmaster/Eventfinda account terms and add API keys as repository secrets.
- Approve the product name, privacy/disclaimer copy and feedback address.
- Choose repository visibility and recruit Auckland drivers for testing.

## Verification — 3 November 2026

- `npm run check`: passed (ESLint, strict TypeScript, 37 Vitest cases, production PWA build).
- `npm run test:e2e`: 5/5 mobile Chromium journeys passed at 390 × 844 px, including stale data, theme persistence and an offline reload.
- Production build: 12 precached entries; main JS 329.74 kB / 100.73 kB gzip.
- Lighthouse mobile: Performance 99, Accessibility 100, Best Practices 96, SEO 100; FCP 0.8 s, LCP 2.0 s, TBT 0 ms, CLS 0.
- Spreadsheet inspection: `events.xlsx` has 2 data rows, matching `events.json`.
- `npm audit`: no critical findings; the original high-severity `xlsx` dependency was removed. Moderate/low transitive build-tool advisories remain for Phase 5 review.
