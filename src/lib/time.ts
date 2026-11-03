export const AUCKLAND_TIME_ZONE = 'Pacific/Auckland';

export function aucklandLocalToUtc(localDateTime: string): string {
  const match = localDateTime.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) throw new Error(`Invalid Auckland local timestamp: ${localDateTime}`);
  const [, year, month, day, hour, minute, second = '00'] = match;
  const naiveUtc = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
  let candidate = naiveUtc;
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: AUCKLAND_TIME_ZONE,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date(candidate));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const renderedAsUtc = Date.UTC(+values.year, +values.month - 1, +values.day, +values.hour, +values.minute, +values.second);
    candidate -= renderedAsUtc - naiveUtc;
  }
  return new Date(candidate).toISOString();
}

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
