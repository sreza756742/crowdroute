import { daysFileSchema, eventsFileSchema, metaSchema, venuesFileSchema, type Day, type Event, type Meta, type Venue } from './schemas';

export interface DashboardData { days: Day[]; events: Event[]; venues: Venue[]; meta: Meta }

async function loadJson(path: string): Promise<unknown> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${path}`);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

export async function loadDashboardData(): Promise<DashboardData> {
  const [days, events, venues, meta] = await Promise.all([
    loadJson('days.json'), loadJson('events.json'), loadJson('venues.json'), loadJson('meta.json')
  ]);
  return {
    days: daysFileSchema.parse(days),
    events: eventsFileSchema.parse(events),
    venues: venuesFileSchema.parse(venues),
    meta: metaSchema.parse(meta)
  };
}
