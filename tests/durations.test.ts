import { describe, expect, it } from 'vitest';
import { DURATION_MINUTES, estimateEnd } from '../src/lib/durations';

describe('finish-time estimation', () => {
  it.each(Object.entries(DURATION_MINUTES))('applies the %s default', (category, minutes) => {
    const start = '2026-11-03T00:00:00.000Z';
    expect(new Date(estimateEnd(start, category as keyof typeof DURATION_MINUTES)).valueOf() - new Date(start).valueOf()).toBe(minutes * 60_000);
  });
});
