import { createHash } from 'node:crypto';
import { estimateEnd, MAX_DURATION_MINUTES } from '../src/lib/durations.js';
import { localDate } from '../src/lib/scoring.js';
import type { Event, ReviewItem, Venue } from '../src/lib/schemas.js';
import { eventSchema } from '../src/lib/schemas.js';
import type { RawEvent } from './types.js';

export function normalise(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function enrichVenues(rawEvents: RawEvent[], current: Venue[]): Venue[] {
  const venues = current.map((venue) => ({ ...venue }));
  const byName = new Map(venues.map((venue, index) => [normalise(venue.name), index]));
  const ids = new Set(venues.map((venue) => venue.id));
  for (const raw of rawEvents) {
    if (!raw.venueName || !raw.venueArea) continue;
    const key = normalise(raw.venueName);
    const existingIndex = byName.get(key);
    if (existingIndex !== undefined) {
      if (!venues[existingIndex].address && raw.venueAddress) venues[existingIndex].address = raw.venueAddress;
      continue;
    }
    const baseId = key.replace(/ /g, '-') || 'venue';
    let id = baseId;
    let suffix = 2;
    while (ids.has(id)) { id = `${baseId}-${suffix}`; suffix += 1; }
    const venue: Venue = {
      id, name: raw.venueName, address: raw.venueAddress ?? null, lat: raw.venueLat ?? null, lng: raw.venueLng ?? null,
      area: raw.venueArea, capacity: null, notes: 'Imported from the Driver-Data Google Sheet.'
    };
    byName.set(key, venues.length); ids.add(id); venues.push(venue);
  }
  return venues;
}

export function processRawEvents(rawEvents: RawEvent[], venues: Venue[], now = new Date()): { events: Event[]; review: ReviewItem[] } {
  const events: Event[] = [];
  const review: ReviewItem[] = [];
  const venueByName = new Map(venues.map((venue) => [normalise(venue.name), venue]));

  for (const raw of rawEvents) {
    const { title, venueName, startAt: rawStartAt, sourceUrl, category } = raw;
    const missing = !title || !venueName || !rawStartAt || !sourceUrl;
    const venueMatch = venueName ? findVenue(venueName, venues, venueByName) : undefined;
    const venue = venueMatch?.venue;
    if (missing || !venue || raw.confidence < 0.7 || !category) {
      review.push({ source_name: raw.sourceName, source_url: sourceUrl, reason: missing ? 'Missing required field' : !venue ? 'Unknown venue' : raw.confidence < 0.7 ? 'Confidence below 0.7' : 'Missing category', raw: raw.raw });
      continue;
    }
    let startAt: string;
    try { startAt = new Date(rawStartAt).toISOString(); } catch {
      review.push({ source_name: raw.sourceName, source_url: sourceUrl, reason: 'Invalid start time', raw: raw.raw });
      continue;
    }
    const firstDate = localDate(now.toISOString());
    const lastDate = localDate(new Date(now.valueOf() + 7 * 24 * 3_600_000).toISOString());
    const eventDate = localDate(startAt);
    if (eventDate < firstDate || eventDate > lastDate) {
      review.push({ source_name: raw.sourceName, source_url: sourceUrl, reason: 'Start date outside the eight-day window', raw: raw.raw });
      continue;
    }
    let endAt: string;
    try { endAt = raw.endAt ? new Date(raw.endAt).toISOString() : estimateEnd(startAt, category); } catch {
      review.push({ source_name: raw.sourceName, source_url: sourceUrl, reason: 'Invalid end time', raw: raw.raw });
      continue;
    }
    const durationMinutes = (new Date(endAt).valueOf() - new Date(startAt).valueOf()) / 60_000;
    if (durationMinutes <= 0 || durationMinutes > MAX_DURATION_MINUTES[category]) {
      review.push({ source_name: raw.sourceName, source_url: sourceUrl, reason: 'Implausible event duration', raw: raw.raw });
      continue;
    }
    const confidence = raw.confidence - (raw.endAt ? 0 : 0.05) - (venueMatch?.fuzzy ? 0.1 : 0);
    if (confidence < 0.7) {
      review.push({ source_name: raw.sourceName, source_url: sourceUrl, reason: 'Confidence below 0.7 after enrichment', raw: raw.raw });
      continue;
    }
    const date = eventDate;
    const dedupeKey = `${normalise(title)}|${venue.id}|${date}`;
    const event = eventSchema.parse({
      id: createHash('sha256').update(`${raw.sourceName}:${raw.sourceId}`).digest('hex').slice(0, 16),
      title,
      category,
      venue_id: venue.id,
      start_at: startAt,
      est_end_at: endAt,
      end_time_source: raw.endAt ? 'reported' : 'estimated',
      crowd_band: raw.crowdBand ?? crowdBand(venue.capacity),
      source_name: raw.sourceName,
      source_url: sourceUrl,
      confidence,
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

function findVenue(name: string, venues: Venue[], exact: Map<string, Venue>): { venue: Venue; fuzzy: boolean } | undefined {
  const query = normalise(name);
  const direct = exact.get(query);
  if (direct) return { venue: direct, fuzzy: false };
  const candidates = venues.map((venue) => {
    const target = normalise(venue.name);
    const containment = query.length >= 7 && (query.includes(target) || target.includes(query));
    return { venue, score: containment ? 0.9 : similarity(query, target) };
  }).filter((candidate) => candidate.score >= 0.86).sort((a, b) => b.score - a.score);
  if (candidates.length === 0 || (candidates[1] && candidates[0].score === candidates[1].score)) return undefined;
  return { venue: candidates[0].venue, fuzzy: true };
}

function similarity(left: string, right: string): number {
  const rows = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = rows[0]; rows[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const saved = rows[j];
      rows[j] = Math.min(rows[j] + 1, rows[j - 1] + 1, previous + (left[i - 1] === right[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return 1 - rows[right.length] / Math.max(left.length, right.length, 1);
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
