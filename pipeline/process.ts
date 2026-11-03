import { createHash } from 'node:crypto';
import { estimateEnd } from '../src/lib/durations.js';
import type { Event, ReviewItem, Venue } from '../src/lib/schemas.js';
import { eventSchema } from '../src/lib/schemas.js';
import type { RawEvent } from './types.js';

export function normalise(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function processRawEvents(rawEvents: RawEvent[], venues: Venue[], now = new Date()): { events: Event[]; review: ReviewItem[] } {
  const events: Event[] = [];
  const review: ReviewItem[] = [];
  const venueByName = new Map(venues.map((venue) => [normalise(venue.name), venue]));

  for (const raw of rawEvents) {
    const { title, venueName, startAt: rawStartAt, sourceUrl, category } = raw;
    const missing = !title || !venueName || !rawStartAt || !sourceUrl;
    const venue = raw.venueName ? venueByName.get(normalise(raw.venueName)) : undefined;
    if (missing || !venue || raw.confidence < 0.7 || !category) {
      review.push({ source_name: raw.sourceName, source_url: sourceUrl, reason: missing ? 'Missing required field' : !venue ? 'Unknown venue' : raw.confidence < 0.7 ? 'Confidence below 0.7' : 'Missing category', raw: raw.raw });
      continue;
    }
    const startAt = new Date(rawStartAt).toISOString();
    const date = startAt.slice(0, 10);
    const dedupeKey = `${normalise(title)}|${venue.id}|${date}`;
    const event = eventSchema.parse({
      id: createHash('sha256').update(`${raw.sourceName}:${raw.sourceId}`).digest('hex').slice(0, 16),
      title,
      category,
      venue_id: venue.id,
      start_at: startAt,
      est_end_at: raw.endAt ? new Date(raw.endAt).toISOString() : estimateEnd(startAt, category),
      end_time_source: raw.endAt ? 'reported' : 'estimated',
      crowd_band: crowdBand(venue.capacity),
      source_name: raw.sourceName,
      source_url: sourceUrl,
      confidence: raw.endAt ? raw.confidence : Math.max(0, raw.confidence - 0.05),
      updated_at: now.toISOString(),
      dedupe_key: dedupeKey
    });
    events.push(event);
  }

  const deduped = new Map<string, Event>();
  for (const event of events) {
    const current = deduped.get(event.dedupe_key);
    if (!current || completeness(event) > completeness(current)) deduped.set(event.dedupe_key, event);
  }
  return { events: [...deduped.values()].sort((a, b) => a.start_at.localeCompare(b.start_at)), review };
}

function crowdBand(capacity: number | null): Event['crowd_band'] {
  if (capacity === null) return 'medium';
  if (capacity >= 25_000) return 'very_large';
  if (capacity >= 8_000) return 'large';
  if (capacity >= 2_000) return 'medium';
  return 'small';
}

function completeness(event: Event): number {
  return (event.end_time_source === 'reported' ? 2 : 0) + event.confidence;
}
