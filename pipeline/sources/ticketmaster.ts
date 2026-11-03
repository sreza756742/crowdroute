import type { Category } from '../../src/lib/schemas.js';
import type { EventSource, RawEvent } from '../types.js';

interface TicketmasterResponse {
  _embedded?: { events?: TicketmasterEvent[] };
}
interface TicketmasterEvent {
  id: string;
  name: string;
  url: string;
  dates: { start: { dateTime?: string }; end?: { dateTime?: string } };
  classifications?: Array<{ segment?: { name?: string }; genre?: { name?: string } }>;
  _embedded?: { venues?: Array<{ name?: string; city?: { name?: string } }> };
}

function mapCategory(event: TicketmasterEvent): Category {
  const text = `${event.classifications?.[0]?.segment?.name ?? ''} ${event.classifications?.[0]?.genre?.name ?? ''}`.toLowerCase();
  if (/sport/.test(text)) return 'sport';
  if (/racing|motorsport/.test(text)) return 'racing';
  if (/festival/.test(text)) return 'festival';
  if (/theatre|arts|comedy|family/.test(text)) return 'show';
  if (/music/.test(text)) return 'concert';
  return 'other';
}

export class TicketmasterSource implements EventSource {
  readonly name = 'Ticketmaster Discovery API';
  constructor(private readonly apiKey: string) {}

  async fetch(from: Date, to: Date): Promise<RawEvent[]> {
    const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
    url.searchParams.set('apikey', this.apiKey);
    url.searchParams.set('countryCode', 'NZ');
    url.searchParams.set('city', 'Auckland');
    url.searchParams.set('startDateTime', from.toISOString());
    url.searchParams.set('endDateTime', to.toISOString());
    url.searchParams.set('size', '200');
    url.searchParams.set('sort', 'date,asc');
    const response = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'AucklandDriverEvents/0.1' } });
    if (!response.ok) throw new Error(`Ticketmaster returned ${response.status}`);
    const payload = (await response.json()) as TicketmasterResponse;
    return (payload._embedded?.events ?? []).map((event) => ({
      sourceId: event.id,
      title: event.name,
      category: mapCategory(event),
      venueName: event._embedded?.venues?.[0]?.name,
      startAt: event.dates.start.dateTime,
      endAt: event.dates.end?.dateTime,
      sourceName: this.name,
      sourceUrl: event.url,
      confidence: 0.95,
      raw: event
    }));
  }
}
