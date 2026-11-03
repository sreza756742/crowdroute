import { describe, expect, it } from 'vitest';
import { eventSchema, venueSchema } from '../src/lib/schemas';

describe('data schemas', () => {
  it('rejects an event without a source URL', () => {
    expect(() => eventSchema.parse({ title: 'Incomplete' })).toThrow();
  });
  it('rejects invalid venue coordinates', () => {
    expect(() => venueSchema.parse({ id: 'x', name: 'X', address: 'A', lat: -100, lng: 174, area: 'central', capacity: null, notes: null })).toThrow();
  });
});
