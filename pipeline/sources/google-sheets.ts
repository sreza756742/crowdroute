import type { Area, Category, CrowdBand } from '../../src/lib/schemas.js';
import type { EventSource, RawEvent } from '../types.js';

const categories = new Set<Category>(['concert', 'festival', 'sport', 'racing', 'show', 'other']);
const crowdBands = new Set<CrowdBand>(['small', 'medium', 'large', 'very_large']);
const areaMap: Record<string, Area> = {
  'auckland central': 'central',
  'north auckland': 'north',
  'south auckland': 'south',
  'east auckland': 'east',
  'west auckland': 'west'
};

export class GoogleSheetsSource implements EventSource {
  readonly name = 'Driver-Data Google Sheet';
  constructor(private readonly csvUrl: string) {}

  async fetch(): Promise<RawEvent[]> {
    const response = await fetch(this.csvUrl, { headers: { accept: 'text/csv' } });
    if (!response.ok) throw new Error(`Google Sheet CSV returned ${response.status}`);
    return parseGoogleSheetCsv(await response.text());
  }
}

export function parseGoogleSheetCsv(csv: string): RawEvent[] {
  const [headers, ...rows] = parseCsv(csv);
  if (!headers) return [];
  const required = ['title', 'category', 'venue_name', 'start_date', 'start_time', 'source_name', 'source_url', 'status'];
  for (const header of required) if (!headers.includes(header)) throw new Error(`Google Sheet is missing required column: ${header}`);

  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ''])))
    .filter((row) => row.status.toLowerCase() === 'publish')
    .map((row) => {
      const category = categories.has(row.category as Category) ? row.category as Category : undefined;
      const crowdBand = crowdBands.has(row.crowd_band as CrowdBand) ? row.crowd_band as CrowdBand : 'unknown';
      const startAt = localAucklandTime(row.start_date, row.start_time);
      const endAt = row.end_date && row.end_time ? localAucklandTime(row.end_date, row.end_time) : undefined;
      return {
        sourceId: row.event_id || `${row.title}|${row.venue_name}|${row.start_date}`,
        title: row.title,
        category,
        venueName: row.venue_name,
        venueAddress: row.venue_address || undefined,
        venueArea: areaMap[row.area.toLowerCase()],
        startAt,
        endAt,
        sourceName: row.source_name,
        sourceUrl: row.source_url,
        confidence: 0.95,
        crowdBand,
        raw: row
      } satisfies RawEvent;
    });
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') { cell += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') { row.push(cell); cell = ''; }
    else if (character === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += character;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

function localAucklandTime(date: string, time: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return undefined;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(localAsUtc));
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const represented = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'));
  return new Date(localAsUtc - (represented - localAsUtc)).toISOString();
}
