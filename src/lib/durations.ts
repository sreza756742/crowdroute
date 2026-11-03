import type { Category } from './schemas';

export const DURATION_MINUTES: Record<Category, number> = {
  concert: 180,
  festival: 480,
  sport: 180,
  racing: 300,
  show: 150,
  other: 120
};

export const MAX_DURATION_MINUTES: Record<Category, number> = {
  concert: 480,
  festival: 1_440,
  sport: 480,
  racing: 720,
  show: 360,
  other: 480
};

export function estimateEnd(startAt: string, category: Category): string {
  const start = new Date(startAt);
  if (Number.isNaN(start.valueOf())) throw new Error(`Invalid start time: ${startAt}`);
  return new Date(start.valueOf() + DURATION_MINUTES[category] * 60_000).toISOString();
}
