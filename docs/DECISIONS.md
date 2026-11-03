# Decisions

- 2026-11-03 — Use Vite + React with a small hand-authored CSS token system; this keeps the first load and dependency surface smaller than a component framework.
- 2026-11-03 — Use relative asset and data URLs so one build works at a GitHub Pages project path.
- 2026-11-03 — Use Ticketmaster Discovery as the first automated source; it is structured, covers New Zealand and has a documented free default quota, but requires an owner-supplied key.
- 2026-11-03 — Keep venue capacity `null` until an official venue page states a capacity that can be cited; crowd bands remain conservative when capacity is unknown.
- 2026-11-03 — Treat the committed XLSX file as the spreadsheet target; Google Sheets would introduce credentials and a service dependency.
- 2026-11-03 — GitHub Pages is suitable for the MVP: official limits state a recommended 1 GB repository, 1 GB published site, 100 GB/month soft bandwidth and 10-minute deployment timeout. This app is far below those limits. Source: <https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits>.
- 2026-11-03 — Schedule at 03:00 and 17:00 UTC (16:00 and 06:00 during NZDT). GitHub cron is UTC and can be delayed; in NZST the local times shift one hour earlier. This trade-off avoids four runs a day.
