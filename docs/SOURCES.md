# Sources register

Reviewed 3 November 2026. Facts only are retained; descriptions and images are not copied.

| Source | Structured access | Terms / robots finding | Rate / auth | Status |
| --- | --- | --- | --- | --- |
| Ticketmaster Discovery API | Official JSON REST API, filtered to Auckland and the eight-day UTC window | [Developer terms](https://developer.ticketmaster.com/support/terms-of-use/) permit API use subject to attribution, privacy disclosure, reasonable caching and removal requests. The app links every record to its Ticketmaster URL and stores only event facts for the active window. API access does not rely on website scraping or website robots rules. | API key required. [Official docs](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/) document 5,000 calls/day and 5 calls/second (the FAQ currently says 2 calls/second, so the pipeline stays below the lower figure). | Approved and implemented; owner must accept the terms and add the key. |
| Eventfinda Developer API v2 | Official XML/JSON event API with Auckland location and category resources | [Official API documentation](https://www.eventfinda.co.nz/api/v2/category) exposes event taxonomy and fields; Eventfinda also documents that third parties use its API to display listings. Access is through issued API credentials, not scraping. The account holder must confirm any account-specific API terms before activation. | API username/password required; published general rate limit was not found, so the adapter performs one narrow, 200-row request per run. | Adapter implemented and fixture-tested; activation pending owner credentials, terms acceptance and the Auckland location ID from the API explorer. |
| Auckland Transport major events | Official major-events listing with factual event, time, venue and address fields | [AT data-source terms](https://at.govt.nz/about-us/at-data-sources/) state released open data is free to use under CC BY 4.0. The [major-events page](https://at.govt.nz/events) is the seed-data source. Only listed facts are used and the source is attributed. `robots.txt` was checked on 3 November 2026 and does not disallow `/events`. The page uses ordinary HTML cards rather than an API/feed/schema.org payload, so the launch pipeline does not scrape it. | Keyless HTML page. | Approved for the hand-verified seed only; deliberately not automated under the structured-source-only rule. |

## Seed records

- Auckland Transport’s major-events page was last marked updated 28 October 2026 and listed BLACKCAPS v India ODI on 4 November 2026 at 3pm at Eden Park, plus Auckland FC v Wellington Phoenix on 7 November 2026 at 5pm at Go Media Stadium. These two records seed the UI without fabricated data.
- Venue addresses come from the same Auckland Transport page. Coordinates are used only to construct map destinations and should be rechecked against each venue’s official contact page before launch.

## Candidates not yet enabled

- Auckland Stadiums has an official “What’s On” page, but automated use is held until its robots file and site terms are recorded explicitly.
- Eden Park has an official structured events page, but individual start times are not consistently exposed in the list, so records without a verified time go to review.
- HRNZ publishes API documentation, but its documented endpoints returned HTTP 403 during the 3 November 2026 access check. Do not enable it unless HRNZ grants access and confirms reuse terms.
