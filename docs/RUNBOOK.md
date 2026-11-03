# Operations runbook

## What runs where

- The browser reads only versioned static files from `data/`; there is no server, account or personal-data store.
- `.github/workflows/pipeline.yml` fetches, validates and atomically replaces data at 03:00 and 17:00 UTC, commits it, uploads the verified build and deploys Pages directly. That is 16:00 and 06:00 during NZDT, and 15:00 and 05:00 during NZST.
- `.github/workflows/ci.yml` runs lint, strict TypeScript, unit tests, a production build, Lighthouse budgets and 390 px Playwright journeys. A passing `main` build deploys Pages.
- `.github/workflows/keepalive.yml` commits a weekly UTC timestamp because GitHub may disable schedules after prolonged repository inactivity. It shares a write-concurrency group with the data pipeline to prevent push races.

## First-time repository setup (owner)

1. Create or connect the GitHub repository and push `main`.
2. In Settings → Pages, choose **GitHub Actions** as the source.
3. In Settings → Actions → General, allow Actions to read and write repository contents.
4. Add `TICKETMASTER_API_KEY`, `EVENTFINDA_USERNAME` and `EVENTFINDA_PASSWORD` under Actions secrets after accepting each provider’s terms.
5. Add the non-secret `EVENTFINDA_LOCATION_ID` under Actions variables. Obtain the Auckland ID from the authenticated Eventfinda API explorer; do not guess it.
6. Manually run **Refresh event data**, check that it publishes a non-zero count, then run **CI** or push a documentation-only commit to deploy.

## Local development and release gate

Use Node 24. Copy `.env.example` to `.env` for local credentials; `.env` is ignored by Git.

```text
npm ci
npm run check
npm run test:e2e
npm run pipeline
```

Before committing generated data, confirm `meta.json` has the expected source counts, `review.json` contains no systematic mapping failure and `events.xlsx` has the same number of rows as `events.json`.

## Add or change a source

1. Read its current terms and robots file. Record access method, attribution, rate limit and review date in `docs/SOURCES.md` before coding.
2. Use only an official API, RSS/iCal feed or schema.org Event payload at launch. Do not turn ordinary event pages into scrapers.
3. Implement `EventSource` in `pipeline/sources`. Return facts only—never descriptions, images, personal data or ticket-holder information.
4. Convert local times to UTC explicitly. Use `aucklandLocalToUtc` for Pacific/Auckland timestamps without an offset.
5. Add fixture tests for the real response shape, category mapping, missing fields, unknown venue, malformed time and timezone changes.
6. Add credentials only as Actions secrets and non-sensitive IDs as Actions variables.
7. Run the source alone first. A zero-event result or a drop below half of the previous published count must fail without replacing last-good data.

## Add or correct a venue

Add the venue to `data/venues.json` with a stable lowercase ID, official address and coordinates. Cite the official page in `docs/SOURCES.md`. Set capacity to `null` unless an official venue source states it. A new spelling should normally be handled by the conservative fuzzy matcher; do not add broad aliases that could match two venues.

## Diagnose a failed refresh

1. Open Actions → **Refresh event data** → latest run → **Rebuild static data atomically**.
2. `401`/`403`: verify the relevant secret, provider account and terms. Rotate a compromised or revoked key.
3. Zero events: check the source’s date/location parameters and upstream status. Do not weaken the zero-event guard.
4. Count dropped below half: compare `meta.json` source counts with the workflow log. Run one source at a time locally. Do not overwrite last-good files until the drop is understood.
5. Many `Unknown venue` reviews: verify official venue names and add a properly sourced venue. Do not lower the fuzzy threshold globally.
6. Invalid time/duration reviews: inspect the source timezone and end-time semantics. Never substitute a guessed time.
7. Re-run manually after the fix and confirm CI deploys the resulting commit.

GitHub cron can run late. A delayed job is not itself an incident; the app warns users once `meta.json` is over 24 hours old.

## Correct a bad published event

Generated files are not hand-edited in normal operation. Fix the mapper, source record, venue entry or deterministic rule; add a regression test; run the pipeline; and commit the regenerated files. If an unsafe record must disappear immediately, temporarily disable its source, regenerate from the remaining sources and record the incident in `docs/PROGRESS.md`.

## Restore last-good data

Pipeline writes happen in a temporary `.next-<run-id>` directory and move into place only after schema validation, spreadsheet generation and count guards. If a human accidentally commits bad data, revert that single data commit with `git revert <sha>` and redeploy. Do not rewrite `main` history or use `git reset --hard`.

## Rotate source credentials

1. Issue the replacement credential at the provider without revoking the old one.
2. Replace the Actions secret in GitHub Settings.
3. Manually run the pipeline and confirm expected source counts and a passing deployment.
4. Revoke the old credential and record the rotation date outside the public repository.

Secrets must never be placed in `.env.example`, workflow YAML, issues, screenshots or logs.

## Launch and weekly checks

- Open the live URL at a 390 px viewport and check Today, Tomorrow, event detail, Maps, source, filters, all three theme modes and About.
- In DevTools, simulate offline and reload a page visited while online; the shell and last event data should render.
- Confirm the visible “Last updated” time is under 12 hours old at launch.
- Weekly: review failed workflows, stale warnings, `review.json`, source terms changes and dependency alerts.
- Monthly: run `npm audit --audit-level=high`, the secret-signature scan documented in `PROGRESS.md`, and a manual Lighthouse run if the CI trend changed.
