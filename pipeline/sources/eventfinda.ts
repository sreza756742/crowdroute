import type { Category } from '../../src/lib/schemas.js';
import { aucklandLocalToUtc } from '../../src/lib/time.js';
import type { EventSource, RawEvent } from '../types.js';

interface EventfindaCategory { name?: string; url_slug?: string }
interface EventfindaPoint { lat?: number; lng?: number }
interface EventfindaLocation { id?: number | string; name?: string; summary?: string; point?: EventfindaPoint }
interface EventfindaSession {
  id: number | string;
  datetime_start?: string;
  datetime_end?: string;
  is_cancelled?: boolean;
}
export interface EventfindaEvent {
  id: number | string;
  name?: string;
  url?: string;
  datetime_start?: string;
  datetime_end?: string;
  location?: EventfindaLocation;
  venue?: EventfindaLocation;
  address?: string;
  is_cancelled?: boolean;
  category?: EventfindaCategory;
  restrictions?: string;
  sessions?: { sessions?: EventfindaSession[] };
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
  return mapEventfindaSession(event);
}

function mapEventfindaSession(event: EventfindaEvent, session?: EventfindaSession): RawEvent {
  const location = event.venue ?? event.location;
  const point = location?.point;
  return {
    sourceId: session ? `${event.id}:${session.id}` : String(event.id),
    title: event.name,
    category: categoryFor(event),
    venueName: location?.name,
    venueAddress: event.address || location?.summary,
    venueArea: areaFor(point),
    venueLat: point?.lat,
    venueLng: point?.lng,
    startAt: toUtc(session?.datetime_start ?? event.datetime_start),
    endAt: toUtc(session?.datetime_end ?? event.datetime_end),
    sourceName: 'Eventfinda API',
    sourceUrl: event.url,
    confidence: 0.9,
    raw: {
      event_id: event.id,
      session_id: session?.id,
      name: event.name,
      datetime_start: session?.datetime_start ?? event.datetime_start,
      datetime_end: session?.datetime_end ?? event.datetime_end,
      location: location && { id: location.id, name: location.name, summary: location.summary, point: location.point },
      category: event.category
    }
  };
}

function areaFor(point?: EventfindaPoint): RawEvent['venueArea'] {
  if (point?.lat === undefined || point.lng === undefined) return undefined;
  if (point.lat > -36.8) return 'north';
  if (point.lng < 174.7) return 'west';
  if (point.lat < -36.93) return 'south';
  if (point.lng > 174.82) return 'east';
  return 'central';
}

function sessionsInWindow(event: EventfindaEvent, from: Date, to: Date): RawEvent[] {
  const sessions = event.sessions?.sessions?.filter((session) => !session.is_cancelled) ?? [];
  const mapped = sessions.map((session) => mapEventfindaSession(event, session)).filter((item) => {
    if (!item.startAt) return false;
    const start = new Date(item.startAt).valueOf();
    return start >= from.valueOf() && start <= to.valueOf();
  });
  if (mapped.length > 0) return mapped;
  const fallback = mapEventfindaEvent(event);
  if (!fallback.startAt || event.is_cancelled) return [];
  const start = new Date(fallback.startAt).valueOf();
  return start >= from.valueOf() && start <= to.valueOf() ? [fallback] : [];
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
    url.searchParams.set('fields', 'event:(id,url,name,datetime_start,datetime_end,address,is_cancelled,location,category,sessions),location:(id,name,summary,point),category:(id,name,url_slug),session:(id,datetime_start,datetime_end,is_cancelled)');
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
    return events.flatMap((event) => sessionsInWindow(event, from, to));
  }
}
