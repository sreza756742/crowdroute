import { z } from 'zod';

export const areaSchema = z.enum(['central', 'north', 'south', 'east', 'west']);
export const categorySchema = z.enum(['concert', 'festival', 'sport', 'racing', 'show', 'other']);
export const crowdBandSchema = z.enum(['small', 'medium', 'large', 'very_large']);

export const venueSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  area: areaSchema,
  capacity: z.number().int().positive().nullable(),
  notes: z.string().nullable()
});

export const eventSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: categorySchema,
  venue_id: z.string().min(1),
  start_at: z.string().datetime(),
  est_end_at: z.string().datetime(),
  end_time_source: z.enum(['reported', 'estimated', 'manual']),
  crowd_band: crowdBandSchema,
  source_name: z.string().min(1),
  source_url: z.string().url(),
  confidence: z.number().min(0).max(1),
  updated_at: z.string().datetime(),
  dedupe_key: z.string().min(1)
});

export const daySchema = z.object({
  date: z.string().date(),
  rating: z.enum(['quiet', 'busy', 'very_busy']),
  score: z.number().nonnegative(),
  top_event_ids: z.array(z.string())
});

export const reviewItemSchema = z.object({
  source_name: z.string(),
  source_url: z.string().url().optional(),
  reason: z.string().min(1),
  raw: z.unknown()
});

export const metaSchema = z.object({
  last_successful_run_at: z.string().datetime(),
  source_counts: z.record(z.string(), z.number().int().nonnegative()),
  run_id: z.string().min(1),
  schema_version: z.literal(1)
});

export const venuesFileSchema = z.array(venueSchema);
export const eventsFileSchema = z.array(eventSchema);
export const daysFileSchema = z.array(daySchema);
export const reviewFileSchema = z.array(reviewItemSchema);

export type Area = z.infer<typeof areaSchema>;
export type Category = z.infer<typeof categorySchema>;
export type CrowdBand = z.infer<typeof crowdBandSchema>;
export type Venue = z.infer<typeof venueSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Day = z.infer<typeof daySchema>;
export type Meta = z.infer<typeof metaSchema>;
export type ReviewItem = z.infer<typeof reviewItemSchema>;
