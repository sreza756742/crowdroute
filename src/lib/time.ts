export const AUCKLAND_TIME_ZONE = 'Pacific/Auckland';

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-NZ', { timeZone: AUCKLAND_TIME_ZONE, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

export function formatDay(date: string, style: 'short' | 'long' = 'short'): string {
  return new Intl.DateTimeFormat('en-NZ', { timeZone: AUCKLAND_TIME_ZONE, weekday: style, month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00+12:00`));
}

export function relativeUpdated(iso: string): string {
  const hours = Math.max(0, Math.round((Date.now() - new Date(iso).valueOf()) / 3_600_000));
  if (hours < 1) return 'less than an hour ago';
  return `${hours} hour${hours === 1 ? '' : 's'} ago`;
}

export function isStale(iso: string): boolean {
  return Date.now() - new Date(iso).valueOf() > 24 * 3_600_000;
}
