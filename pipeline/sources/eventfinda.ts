import type { Category } from '../../src/lib/schemas.js';
import { aucklandLocalToUtc } from '../../src/lib/time.js';
import type { EventSource, RawEvent } from '../types.js';

interface EventfindaCategory { name?: string; url_slug?: string }
interface EventfindaLocation { name?: string }
export interface EventfindaEvent {
  id: number | string;
  name?: string;
  url?: string;
  datetime_start?: string;
  datetime_end?: string;
  location?: EventfindaLocation;
  venue?: EventfindaLocation;
  category?: EventfindaCategory;
  restrictions?: string;
}
interface EventfindaResponse { events?: EventfindaEvent[]; count?: number }

export interface EventfindaCredentials { username: string; password: string; locationId: string }
interface EventfindaClientOptions {
  fetch?: typeof fetch;
  pause?: (milliseconds: number) => Promise<void>;
}

function categoryFor(event: EventfindaEvent): Category {
  const text = `${event.category?.name ?? ''} ${event.category?.url_slug ?? ''}`.toLowerCase();
  if (/horse racing|motorsport|racing/.test(text)) return 'racing';
  if (/sport|outdoor/.test(text)) return 'sport';
  if (/festival/.test(text)) return 'festival';
  if (/concert|gig|music/.test(text)) return 'concert';
  if (/performing|theatre|comedy|dance|show|musical|opera/.test(text)) return 'show';
  return 'other';
}

function toUtc(value?: string): string | undefined {
  if (!value) return undefined;
  return /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? new Date(value).toISOString() : aucklandLocalToUtc(value);
}

export function mapEventfindaEvent(event: EventfindaEvent): RawEvent {
  return {
    sourceId: String(event.id),
    title: event.name,
    category: categoryFor(event),
    venueName: event.venue?.name ?? event.location?.name,
    startAt: toUtc(event.datetime_start),
    endAt: toUtc(event.datetime_end),
    sourceName: 'Eventfinda API',
    sourceUrl: event.url,
    confidence: 0.9,
    raw: event
  };
}

export class EventfindaSource implements EventSource {
  readonly name = 'Eventfinda API';
  private readonly fetchClient: typeof fetch;
  private readonly pause: (milliseconds: number) => Promise<void>;

  constructor(private readonly credentials: EventfindaCredentials, options: EventfindaClientOptions = {}) {
    this.fetchClient = options.fetch ?? fetch;
    this.pause = options.pause ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  async fetch(from: Date, to: Date): Promise<RawEvent[]> {
    const url = new URL('https://api.eventfinda.co.nz/v2/events.json');
    url.searchParams.set('location', this.credentials.locationId);
    url.searchParams.set('start_date', from.toISOString().slice(0, 10));
    url.searchParams.set('end_date', to.toISOString().slice(0, 10));
    url.searchParams.set('rows', '20');
    const authorization = Buffer.from(`${this.credentials.username}:${this.credentials.password}`).toString('base64');
    const events: EventfindaEvent[] = [];
    let total = Number.POSITIVE_INFINITY;
    let offset = 0;
    while (offset < total) {
      url.searchParams.set('offset', String(offset));
      const response = await this.fetchClient(url.toString(), { headers: { accept: 'application/json', authorization: `Basic ${authorization}`, 'user-agent': 'AucklandDriverEvents/0.3' } });
      if (!response.ok) throw new Error(`Eventfinda returned ${response.status}`);
      const payload = (await response.json()) as EventfindaResponse;
      const page = payload.events ?? [];
      total = payload.count ?? page.length;
      events.push(...page);
      offset += page.length;
      if (page.length === 0 || offset >= total) break;
      await this.pause(1_000);
    }
    return events.map(mapEventfindaEvent);
  }
}
