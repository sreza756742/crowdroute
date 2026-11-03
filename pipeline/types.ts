import type { Category } from '../src/lib/schemas.js';

export interface RawEvent {
  sourceId: string;
  title?: string;
  category?: Category;
  venueName?: string;
  startAt?: string;
  endAt?: string;
  sourceName: string;
  sourceUrl?: string;
  confidence: number;
  raw: unknown;
}

export interface EventSource {
  name: string;
  fetch(from: Date, to: Date): Promise<RawEvent[]>;
}
