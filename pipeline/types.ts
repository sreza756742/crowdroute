import type { Area, Category, CrowdBand } from '../src/lib/schemas.js';

export interface RawEvent {
  sourceId: string;
  title?: string;
  category?: Category;
  venueName?: string;
  venueAddress?: string;
  venueArea?: Area;
  startAt?: string;
  endAt?: string;
  sourceName: string;
  sourceUrl?: string;
  confidence: number;
  crowdBand?: CrowdBand;
  raw: unknown;
}

export interface EventSource {
  name: string;
  fetch(from: Date, to: Date): Promise<RawEvent[]>;
}
