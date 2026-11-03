# Runbook

This is an early runbook; it will be expanded during hardening.

## Local checks

1. Copy `.env.example` to `.env` and insert a Ticketmaster developer key.
2. Run `npm ci`, then `npm run pipeline`.
3. Run `npm run check`. The pipeline writes data only after every new file validates; zero events or a drop below half of the previous count aborts before replacing last-good files.

## Add a source

1. Record the official terms, robots result, authentication and rate limit in `docs/SOURCES.md` before coding.
2. Implement `EventSource` in `pipeline/sources` and map facts only to `RawEvent`.
3. Add fixture tests for missing fields, venue mismatch, low confidence and duplicates.
4. Add its secret only in GitHub repository Settings → Secrets and variables → Actions.

## Investigate a bad event

Open the latest “Refresh event data” Actions run and inspect source counts. A rejected record is in `data/review.json` with a deterministic reason. Fix mapping or venue aliases in code—do not hand-edit generated event files in normal operation.

## Rotate a key

Issue a replacement at the source, update the matching GitHub Actions secret, manually run the pipeline, confirm valid non-zero output, then revoke the old key. Never paste keys into issues or logs.
