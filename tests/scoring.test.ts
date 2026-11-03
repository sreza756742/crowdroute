import { describe, expect, it } from 'vitest';
import { scoreDay } from '../src/lib/scoring';
import type { Event } from '../src/lib/schemas';

const makeEvent = (id: string, crowd: Event['crowd_band'] = 'medium', category: Event['category'] = 'show', end = '2026-11-03T09:00:00.000Z'): Event => ({
  id, title: id, category, venue_id: 'venue', start_at: '2026-11-03T06:00:00.000Z', est_end_at: end,
  end_time_source: 'estimated', crowd_band: crowd, source_name: 'Official', source_url: `https://example.com/${id}`,
  confidence: .9, updated_at: '2026-11-03T00:00:00.000Z', dedupe_key: id
});

describe('day busyness scoring', () => {
  it.each([
    ['empty day', [], 'quiet'],
    ['one small show', [makeEvent('a', 'small')], 'quiet'],
    ['one medium show', [makeEvent('a')], 'quiet'],
    ['one large concert', [makeEvent('a', 'large', 'concert')], 'quiet'],
    ['one very large concert', [makeEvent('a', 'very_large', 'concert')], 'busy'],
    ['two large sports events', [makeEvent('a', 'large', 'sport'), makeEvent('b', 'large', 'sport', '2026-11-03T09:30:00.000Z')], 'busy'],
    ['two overlapping very large events', [makeEvent('a', 'very_large', 'sport'), makeEvent('b', 'very_large', 'concert', '2026-11-03T09:45:00.000Z')], 'very_busy'],
    ['separate finishes without bonus', [makeEvent('a', 'large', 'sport'), makeEvent('b', 'large', 'sport', '2026-11-03T12:00:00.000Z')], 'busy'],
    ['three medium clustered shows', [makeEvent('a'), makeEvent('b', 'medium', 'show', '2026-11-03T09:30:00.000Z'), makeEvent('c', 'medium', 'show', '2026-11-03T10:00:00.000Z')], 'busy'],
    ['other category carries lower weight', [makeEvent('a', 'medium', 'other')], 'quiet']
  ] as const)('%s', (_name, events, expected) => {
    expect(scoreDay('2026-11-03', [...events]).rating).toBe(expected);
  });

  it('adds a finish clustering bonus', () => {
    const result = scoreDay('2026-11-03', [makeEvent('a'), makeEvent('b', 'medium', 'show', '2026-11-03T10:00:00.000Z')]);
    expect(result.score).toBe(8);
  });
});
