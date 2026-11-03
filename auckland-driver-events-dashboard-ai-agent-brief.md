# Auckland Driver Events Dashboard: AI Agent Build Brief

Date: 3 November 2026

You are an autonomous AI coding agent. Build, test and deploy a free mobile-first web dashboard showing Auckland rideshare drivers the public events of the next 7 days, with no human writing code, hosted free on GitHub Pages.

## 1. Operating rules

Work autonomously from this brief. Do not wait for human input except for the items in section 9 marked human-only.

1. **Work in phases.** Complete the phases in section 8 in order. Do not start a phase until the previous phase's acceptance tests pass.
2. **Test first where possible.** Write tests alongside code. Run the full test suite, linter and type checker before every commit.
3. **Commit small and often.** One logical change per commit, with a clear message. Keep `main` always deployable.
4. **Decide, don't ask.** Where this brief leaves a choice open, pick the simplest option that meets the requirements and record it in `docs/DECISIONS.md` with one line of reasoning.
5. **Never invent data.** Do not fabricate events, venues, capacities or source URLs. If a value cannot be verified, leave it null or send the record to review.
6. **Respect source terms.** Before using any source, read its terms of use and robots.txt. Prefer official APIs and feeds. Record the finding in `docs/SOURCES.md`. Do not use a source whose terms forbid automated access.
7. **Keep secrets out of the repository.** Use environment variables and the hosting platform's secret storage. Provide `.env.example` with placeholder values only.
8. **Control cost.** Launch with no paid services beyond hosting. If AI extraction is enabled later, cap calls per pipeline run (default 100) and log token use per run.
9. **Report.** After each phase, update `docs/PROGRESS.md` with what was done, test results, open issues and the next phase.

## 2. Product and scope

The product answers one question for Auckland taxi and rideshare drivers: when and where will demand be high tomorrow? Users plan shifts a day ahead, mostly on phones, often at night.

**In scope (MVP)**

- Events in the Auckland region for today plus the next 7 days: concerts, music festivals, live shows, sport, racing (motorsport and horse racing).
- Day chips with a busyness rating per day: Quiet, Busy, Very Busy.
- Per event: title, category, venue, start time, **estimated finish time (most prominent)**, crowd band, map link, source link.
- Filters by category and area.
- Event detail view.
- "Last updated" timestamp on every screen, with a warning if the data is stale.
- Installable PWA with dark mode by default.
- Free to use. No login and no user accounts.

**Out of scope for launch**

- Daily alerts and subscriber storage (they need a server; see section 10).
- AI extraction of unstructured pages (see section 10).
- Ride-hailing, dispatch, earnings tracking, driver chat, ride-platform surge data, native apps, ticket sales.
- Non-event demand signals (flights, cruise ships, conferences). Leave extension points only.

**Language and region.** English. All times shown in Pacific/Auckland, stored in UTC.

## 3. Architecture and hosting

Host the whole product free on **GitHub Pages**. There is no server and no database. A scheduled GitHub Actions workflow produces static JSON files, and the static site reads them in the browser.

**Flow**

1. GitHub Actions runs the pipeline twice daily (cron).
2. The pipeline writes `events.json`, `days.json`, `review.json` and a spreadsheet copy into the repository.
3. The workflow commits the changes and deploys the site to GitHub Pages.
4. The browser loads the static app and the JSON files, and renders the dashboard.

| Layer | Decision |
| --- | --- |
| Language | TypeScript everywhere |
| Frontend | Static site: Vite and React (or Next.js static export), Tailwind CSS, PWA with a service worker |
| Data store | JSON files in the repository, committed by the workflow |
| Pipeline | Node scripts run by GitHub Actions on a cron schedule |
| AI extraction | Off at launch (feature flag, default false). Built behind a provider interface so any LLM API with structured JSON output, validated by Zod, can be added later through config alone |
| Testing | Vitest for unit tests, Playwright for end-to-end, Lighthouse CI for performance |
| CI/CD | GitHub Actions: lint, type check, test, build, deploy to Pages |
| Hosting | GitHub Pages with the default HTTPS address (custom domain optional) |
| Secrets | GitHub Actions Secrets only; the repository must never contain keys |

**Repository layout**

```text
/src            static app: pages, components, lib (scoring, time)
/pipeline       sources, validators, enrichers, publish, export
/data           events.json, days.json, review.json, venues.json, events.xlsx
/public         PWA manifest, icons
/tests          unit and end-to-end tests
/docs           DECISIONS.md, SOURCES.md, PROGRESS.md, RUNBOOK.md
/.github/workflows   pipeline.yml, ci.yml
```

**Constraints to respect**

- The repository will probably be public, so never commit secrets, personal data or copyrighted content.
- Scheduled workflows can start late and may be disabled after a long period of repository inactivity. Handle this in sections 5 and 9.
- Free hosting and Actions limits can change. Check GitHub's current terms and record them in `docs/DECISIONS.md`.
- Keep data files small (a few hundred events at most) so the app loads fast.

## 4. Data files

All files live in `/data` and are served as static JSON. Store timestamps in UTC (ISO 8601).

| File | Contents |
| --- | --- |
| venues.json | id, name, address, lat, lng, area (enum), capacity (int, nullable), notes. Hand-seeded once, edited by the agent only with a cited source |
| events.json | published events for today plus 7 days, sorted by start time |
| days.json | per day: date, rating (quiet, busy, very_busy), score, top event ids |
| review.json | low-confidence or rejected records with the reason, never shown in the app |
| meta.json | last successful run time, source counts, run id, schema version |
| events.xlsx | spreadsheet copy of events.json, overwritten each run |

**Event fields:** id, title, category (concert, festival, sport, racing, show, other), venue_id, start_at, est_end_at, end_time_source (reported, estimated, manual), crowd_band (small, medium, large, very_large), source_name, source_url, confidence (0 to 1), updated_at, dedupe_key.

**Rules**

- `dedupe_key` = normalised title + venue_id + start date. Keep one record per key.
- Publish an event only when title, venue_id, start_at and source_url are present and confidence is at least 0.7. Everything else goes to `review.json`.
- Take venue capacities only from official venue pages, cite each in `docs/SOURCES.md`, and leave null if unverified.
- Validate every file against a Zod schema in the pipeline and in tests. A schema version in `meta.json` lets the app reject files it cannot read.
- Do not store personal data of any kind.

## 5. Data pipeline

A GitHub Actions workflow (`pipeline.yml`) runs **twice daily** (default 06:00 and 16:00 Pacific/Auckland, written as UTC cron entries and documented for daylight saving) and can also be started manually. Each run rebuilds the next-7-days window. No manual data edits are allowed in normal operation.

**Steps, in order**

1. **Fetch.** Each source is a module in `/pipeline/sources` that returns raw items. Use only structured sources at launch: official APIs and feeds, iCal and RSS, and schema.org Event markup. Cache responses and respect rate limits.
2. **Map.** Convert each source's format into the event schema. Do not use AI at launch. An optional AI extractor interface exists but is disabled (see section 10).
3. **Validate.** Deterministic rules: start date within the window, venue matches a known venue (fuzzy match, then review), plausible start time, duration within the range for the category, required fields present.
4. **Enrich.** Estimate `est_end_at` from category defaults in `/src/lib/durations.ts` (configurable) unless the source gives an end time. Attach venue capacity and crowd band. Merge duplicates across sources by `dedupe_key`, keeping the record with the most complete fields.
5. **Score confidence.** Official structured source: 0.9 or higher. Reduce for a fuzzy venue match or a missing end time. Below 0.7 goes to `review.json`.
6. **Rate days.** Compute `days.json` with the scoring in section 6.
7. **Write and export.** Write the JSON files and `events.xlsx`, overwriting the previous versions. Update `meta.json`.
8. **Commit and deploy.** Commit only if files changed, then deploy to GitHub Pages.
9. **Alert on failure.** If a run fails, publishes zero events, or publishes less than half the previous run's count, fail the workflow so GitHub sends a failure notification, and keep the last good data files untouched.

**Source rules**

- Start with 3 to 5 permitted sources that offer structured data (APIs, feeds, iCal or schema.org markup).
- Record each source's terms, access method and rate limits in `docs/SOURCES.md` before use. Do not use a source whose terms forbid automated access.
- Store `source_name` and `source_url` on every event. Do not copy descriptions or images; show facts and link out.
- Keep source API keys in GitHub Actions Secrets.

**Reliability**

- Add a lightweight weekly commit or keepalive step so scheduled workflows are not disabled by inactivity.
- The app shows a stale-data warning when `meta.json` is older than 24 hours.

## 6. Busyness scoring

Scoring runs in the pipeline and writes `days.json`. The app only displays it. Keep the weights in `/src/lib/scoring.config.ts`, never inline.

- Event score = crowd weight (from venue capacity or crowd band) × category weight (sport and concert higher than small shows).
- Group events by day. Events whose finish times fall within the same 90-minute window add a clustering bonus.
- Day score = sum of event scores plus bonuses. Map to Quiet, Busy or Very Busy using thresholds in config.
- Unit-test the scoring with at least 10 fixed cases, including an empty day, one large event, and two overlapping finishes.
- Label the result "expected busy" everywhere. Never claim guaranteed surge.

## 7. Frontend

The app is a static site. It fetches `meta.json`, `days.json` and `events.json` from the same origin, validates them, and renders everything in the browser. Use relative URLs so it works under the GitHub Pages project path.

**Screens**

1. **Home.** Sticky row of day chips (today plus 7 days), each coloured and labelled by rating. Below, the event timeline for the selected day, sorted by finish time. "Tonight" and "Tomorrow" shortcuts.
2. **Event detail.** Title, venue, start, estimated finish, crowd band, "Open in Maps" button, source link.
3. **Filters.** A bottom sheet with category and area, applied in the browser.
4. **About.** Data sources, disclaimer (times and crowds are estimates; not affiliated with any ride platform), privacy notice, and a feedback link.

**Behaviour and design**

- Mobile-first single column. Tap targets of at least 44 px. Large, high-contrast text.
- Dark mode by default, with light mode and system preference support.
- Never use colour alone to show busyness; add the text label.
- Show the estimated finish time in the largest type on each event card.
- Show "Last updated" from `meta.json`. If data is older than 24 hours, show a visible warning.
- Service worker caches the app shell and the last loaded data so the dashboard opens offline.
- Empty states: a friendly message when a day has no events or the data file fails to load.
- No cookies, tracking or accounts at launch.

**Performance and accessibility targets (Lighthouse mobile)**

- Performance 90 or higher, Accessibility 95 or higher, PWA installable.
- First meaningful load under 2 seconds on simulated 4G.
- WCAG 2.1 AA contrast and keyboard navigation.

## 8. Build phases

Tick each task only when its acceptance test passes. Do not start the next phase early.

**Phase 0: Setup**

- [ ] Create the repository, TypeScript project, lint, formatting, type check, test runner and CI workflow. Acceptance: CI passes on an empty project.
- [ ] Create the `/docs` files and confirm `.gitignore` excludes secrets. Acceptance: no secrets in the repository.
- [ ] Verify and record permitted data sources in `docs/SOURCES.md`. Acceptance: at least 3 structured sources confirmed usable, each with terms and access method noted.

**Phase 1: Data foundation**

- [ ] Define Zod schemas for every file in section 4 and seed `venues.json`. Acceptance: schemas validate the seed data; invalid samples are rejected in tests.
- [ ] Implement the pipeline for one structured source end to end. Acceptance: running it locally writes valid `events.json` and `meta.json`.
- [ ] Add validation, deduplication and finish-time estimation with unit tests. Acceptance: tests cover rejected records, duplicates and every category default.

**Phase 2: Full pipeline and workflow**

- [ ] Add the remaining structured sources, confidence scoring and `review.json`. Acceptance: low-confidence records never appear in `events.json`.
- [ ] Add the optional AI extractor interface and the `AI_EXTRACTION_ENABLED` flag, off by default. Acceptance: with the flag off, no AI calls are made; a mock provider test passes.
- [ ] Build `pipeline.yml` with two daily cron runs, manual trigger, commit-if-changed, Pages deploy, failure handling and the weekly keepalive. Acceptance: a forced failure fails the workflow and leaves the last good data untouched.
- [ ] Add the spreadsheet export. Acceptance: `events.xlsx` matches `events.json` after each run.

**Phase 3: Scoring**

- [ ] Implement busyness scoring and `days.json` with tests. Acceptance: all scoring cases pass.

**Phase 4: Frontend**

- [ ] Build home, detail, filters, about and the PWA shell. Acceptance: Playwright tests pass at a 390 px wide viewport; Lighthouse targets met.
- [ ] Add dark mode, offline cache and the stale-data warning. Acceptance: app opens offline with the last data and warns when `meta.json` is older than 24 hours.

**Phase 5: Hardening and launch**

- [ ] Write `docs/RUNBOOK.md`: how to add a source, fix a bad event, read workflow logs, rotate secrets. Acceptance: another agent can follow it without extra context.
- [ ] Run a dependency audit and a secrets scan. Acceptance: no high-severity findings and no secrets in history.
- [ ] Deploy to GitHub Pages and run end-to-end tests against the live URL. Acceptance: the live site shows data whose `meta.json` timestamp is less than 12 hours old.

## 9. Definition of done, human-only tasks and open decisions

**Definition of done**

- All phase tasks in section 8 are ticked and their acceptance tests pass in CI.
- The live GitHub Pages site shows the next 7 days of events with start and estimated finish times, a day rating and a source link on every event.
- The workflow runs twice daily without manual action, and a failed run fails visibly and does not blank the dashboard.
- The spreadsheet copy updates after each successful run.
- No paid services are required to run the product.
- `docs/DECISIONS.md`, `docs/SOURCES.md`, `docs/PROGRESS.md` and `docs/RUNBOOK.md` are complete.

**Human-only tasks.** An AI agent cannot do these alone. Stop and list them in `docs/PROGRESS.md` for the owner:

- Create or confirm the GitHub repository, turn on GitHub Pages, and allow Actions to commit and deploy.
- Supply any source API keys as GitHub Actions Secrets.
- Approve the product name, and optionally a custom domain.
- Approve the privacy notice and disclaimer wording before launch.
- Accept or decline any source's terms of use that require a legal agreement.
- Recruit a few Auckland drivers to test and give feedback after launch.

**Open decisions for the owner**

- Public or private repository (private Pages hosting may need a paid GitHub plan).
- Spreadsheet target: the committed `events.xlsx` is the default; confirm if a Google Sheet is also wanted.
- Whether to add daily alerts, and with which service (see section 10).
- Product name and branding.

## 10. Later phases (not in the launch scope)

Build nothing here yet, but keep the design open for it.

| Later phase | What it needs | Design hook to keep open |
| --- | --- | --- |
| AI extraction for unstructured pages | An LLM API key (paid or free tier) stored as a GitHub Secret | Provider interface and the `AI_EXTRACTION_ENABLED` flag; Zod validation of all AI output; per-run call cap |
| Daily alerts (email or web push) | A server or a free-tier messaging service to store subscribers and send messages | A separate alert module that reads `days.json`; no subscriber data in the repository |
| Real backend and database | Hosting with a server (for example a free cloud VM) and PostgreSQL or SQLite | Keep data access behind one module so the app can swap the JSON files for an API without UI changes |
| Extra demand signals | Structured sources for flights, cruise ships, conferences, holidays | A source module per signal and an optional `demand_type` field in the schema |
