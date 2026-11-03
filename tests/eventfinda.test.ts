import { describe, expect, it, vi } from 'vitest';
import { EventfindaSource, mapEventfindaEvent } from '../pipeline/sources/eventfinda';
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

describe('Eventfinda API pagination', () => {
  it('fetches every 20-row page and observes the one-request-per-second limit', async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => ({ id: index + 1, name: `Event ${index + 1}` }));
    const fetchClient = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 21, events: firstPage }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 21, events: [{ id: 21, name: 'Event 21' }] }), { status: 200 }));
    const pause = vi.fn().mockResolvedValue(undefined);
    const source = new EventfindaSource(
      { username: 'api-user', password: 'api-password', locationId: '2' },
      { fetch: fetchClient, pause }
    );

    const events = await source.fetch(new Date('2026-11-03T00:00:00Z'), new Date('2026-11-10T00:00:00Z'));

    expect(events).toHaveLength(21);
    expect(fetchClient).toHaveBeenCalledTimes(2);
    expect(String(fetchClient.mock.calls[0][0])).toContain('rows=20');
    expect(String(fetchClient.mock.calls[0][0])).toContain('offset=0');
    expect(String(fetchClient.mock.calls[1][0])).toContain('offset=20');
    expect(fetchClient.mock.calls[0][1]?.headers).toMatchObject({ authorization: `Basic ${Buffer.from('api-user:api-password').toString('base64')}` });
    expect(pause).toHaveBeenCalledWith(1_000);
  });
});
