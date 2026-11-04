import { describe, expect, it } from 'vitest';
import { processRawEvents } from '../pipeline/process';
import type { RawEvent } from '../pipeline/types';
import type { Venue } from '../src/lib/schemas';

const venue: Venue = { id: 'arena', name: 'Test Arena', address: '1 Test St', lat: -36.8, lng: 174.7, area: 'central', capacity: 10_000, notes: null };
const valid: RawEvent = { sourceId: '1', title: 'Final', category: 'sport', venueName: 'Test Arena', startAt: '2026-11-04T06:00:00.000Z', sourceName: 'Official', sourceUrl: 'https://example.com/event', confidence: .9, raw: {} };

describe('event processing', () => {
  it('publishes a valid event and estimates its finish', () => {
    const result = processRawEvents([valid], [venue], new Date('2026-11-03T00:00:00Z'));
    expect(result.events).toHaveLength(1); expect(result.events[0].end_time_source).toBe('estimated');
  });
  it('sends incomplete records to review', () => {
    const result = processRawEvents([{ ...valid, title: undefined }], [venue]);
    expect(result.events).toHaveLength(0); expect(result.review[0].reason).toMatch(/Missing/);
  });
  it('keeps one event per dedupe key', () => {
    const result = processRawEvents(
      [valid, { ...valid, sourceId: '2', endAt: '2026-11-04T09:00:00Z' }],
      [venue],
      new Date('2026-11-03T00:00:00Z')
    );
    expect(result.events).toHaveLength(1); expect(result.events[0].end_time_source).toBe('reported');
  });
  it('accepts one unambiguous fuzzy venue match and reduces confidence', () => {
    const result = processRawEvents([{ ...valid, venueName: 'Test Arena Auckland' }], [venue], new Date('2026-11-03T00:00:00Z'));
    expect(result.events[0]).toMatchObject({ venue_id: 'arena', confidence: .75 });
  });
  it('rejects records outside the publication window', () => {
    const result = processRawEvents([{ ...valid, startAt: '2026-12-04T06:00:00.000Z' }], [venue], new Date('2026-11-03T00:00:00Z'));
    expect(result.review[0].reason).toMatch(/outside/);
  });
  it('rejects implausible reported durations', () => {
    const result = processRawEvents([{ ...valid, endAt: '2026-11-05T06:00:00.000Z' }], [venue], new Date('2026-11-03T00:00:00Z'));
    expect(result.review[0].reason).toMatch(/duration/);
  });
  it('never publishes confidence below the schema threshold after enrichment', () => {
    const result = processRawEvents([{ ...valid, venueName: 'Test Arena Auckland', confidence: .75 }], [venue], new Date('2026-11-03T00:00:00Z'));
    expect(result.events).toHaveLength(0); expect(result.review[0].reason).toMatch(/Confidence/);
  });
});
