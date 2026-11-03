# Sources register

Reviewed 3 November 2026. Facts only are retained; descriptions and images are not copied.

| Source | Structured access | Terms / robots finding | Rate / auth | Status |
| --- | --- | --- | --- | --- |
| Ticketmaster Discovery API | Official JSON REST API, filtered to Auckland and the eight-day UTC window | [Developer terms](https://developer.ticketmaster.com/support/terms-of-use/) permit API use subject to attribution, privacy disclosure, reasonable caching and removal requests. The app links every record to its Ticketmaster URL and stores only event facts for the active window. API access does not rely on website scraping or website robots rules. | API key required. [Official docs](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/) document 5,000 calls/day and 5 calls/second (the FAQ currently says 2 calls/second, so the pipeline stays below the lower figure). | Approved and implemented; owner must accept the terms and add the key. |
| Eventfinda Developer API v2 | Official XML/JSON event API with Auckland location and category resources | [Official API documentation](https://www.eventfinda.co.nz/api/v2/category) exposes event taxonomy and fields; Eventfinda also documents that third parties use its API to display listings. Access is through an issued API key, not scraping. The account holder must confirm any account-specific API terms before activation. | Account and generated API key required; published general rate limit was not found, so implementation must use one paginated fetch per run and back off on 429. | Confirmed structured integration; activation intentionally pending owner credentials/terms acceptance. |
| Auckland Transport major events | Official major-events listing with stable factual event, time, venue and address fields; page data is rendered in a structured listing | [AT data-source terms](https://at.govt.nz/about-us/at-data-sources/) state released open data is free to use under CC BY 4.0. The [major-events page](https://at.govt.nz/events) is the seed-data source. Only listed facts are used and the source is attributed. Before automating HTML access, re-check `https://at.govt.nz/robots.txt`; the launch pipeline currently does not scrape it. | Keyless page; twice-daily access is the intended maximum after robots verification. | Approved for the hand-verified seed; automated adapter pending robots re-check. |

## Seed records

- Auckland Transport’s major-events page was last marked updated 28 October 2026 and listed BLACKCAPS v India ODI on 4 November 2026 at 3pm at Eden Park, plus Auckland FC v Wellington Phoenix on 7 November 2026 at 5pm at Go Media Stadium. These two records seed the UI without fabricated data.
- Venue addresses come from the same Auckland Transport page. Coordinates are used only to construct map destinations and should be rechecked against each venue’s official contact page before launch.

## Candidates not yet enabled

- Auckland Stadiums has an official “What’s On” page, but automated use is held until its robots file and site terms are recorded explicitly.
- Eden Park has an official structured events page, but individual start times are not consistently exposed in the list, so records without a verified time go to review.
