# Auckland Driver Events

The dashboard combines the public `Driver-Data` Google Sheet with optional structured event APIs and publishes validated static data for the web app.

## Eventfinda setup

Eventfinda's Developer API uses HTTP Basic authentication. Apply for standard public-event API access from the [Eventfinda API overview](https://www.eventfinda.co.nz/api/overview), then configure these repository secrets:

- `EVENTFINDA_USERNAME` — the issued API username
- `EVENTFINDA_PASSWORD` — the issued API password/key

The pipeline defaults to Eventfinda location ID `2` (Auckland). Override `EVENTFINDA_LOCATION_ID` only when running the pipeline for another region.

Do not expose Eventfinda credentials in Vite variables or browser code. They belong only in the server-side pipeline or GitHub Actions secrets.

## Local commands

```powershell
npm ci
npm run check
npm run test:e2e
```

To include Eventfinda during a local refresh, set the credentials in the current shell and run `npm run pipeline`. The pipeline limits Eventfinda traffic to one request per second and paginates at the documented 20-row maximum.
