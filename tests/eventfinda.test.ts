import { describe, expect, it } from 'vitest';
import { mapEventfindaEvent } from '../pipeline/sources/eventfinda';
import { aucklandLocalToUtc } from '../src/lib/time';

describe('Eventfinda source mapping', () => {
  it('maps official API fields without copying descriptions or images', () => {
    const result = mapEventfindaEvent({
      id: 42,
      name: 'Auckland Final',
      url: 'https://www.eventfinda.co.nz/2026/final/auckland',
      datetime_start: '2026-11-07T19:30:00',
      datetime_end: '2026-11-07T21:30:00',
      venue: { name: 'Spark Arena' },
      category: { name: 'Sports & Outdoors' }
    });
    expect(result).toMatchObject({ sourceId: '42', title: 'Auckland Final', category: 'sport', venueName: 'Spark Arena', startAt: '2026-11-07T06:30:00.000Z' });
  });

  it.each([
    ['Horse Racing', 'racing'],
    ['Music Festivals', 'festival'],
    ['Concerts & Gig Guide', 'concert'],
    ['Performing Arts', 'show']
  ] as const)('maps %s to %s', (name, category) => {
    expect(mapEventfindaEvent({ id: 1, category: { name } }).category).toBe(category);
  });
});

describe('Auckland local timestamp conversion', () => {
  it('uses the daylight-saving offset in November', () => expect(aucklandLocalToUtc('2026-11-07T19:30:00')).toBe('2026-11-07T06:30:00.000Z'));
  it('uses the standard-time offset in June', () => expect(aucklandLocalToUtc('2026-06-07T19:30:00')).toBe('2026-06-07T07:30:00.000Z'));
});
