import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { scoreDay } from '../src/lib/scoring.js';
import { daysFileSchema, eventsFileSchema, metaSchema, reviewFileSchema, venuesFileSchema } from '../src/lib/schemas.js';
import { exportEventsSpreadsheet } from './export.js';
import { processRawEvents } from './process.js';
import { TicketmasterSource } from './sources/ticketmaster.js';
import type { EventSource } from './types.js';

const dataDir = path.resolve('data');

export async function runPipeline(sources: EventSource[], now = new Date()): Promise<void> {
  const venues = venuesFileSchema.parse(JSON.parse(await readFile(path.join(dataDir, 'venues.json'), 'utf8')));
  const end = new Date(now.valueOf() + 8 * 24 * 3_600_000);
  const settled = await Promise.all(sources.map(async (source) => ({ source, items: await source.fetch(now, end) })));
  const raw = settled.flatMap(({ items }) => items);
  const { events, review } = processRawEvents(raw, venues, now);
  if (sources.length > 0 && events.length === 0) throw new Error('Pipeline produced zero publishable events; last good data preserved.');
  const previous = eventsFileSchema.parse(JSON.parse(await readFile(path.join(dataDir, 'events.json'), 'utf8')));
  if (previous.length > 0 && events.length < previous.length / 2) {
    throw new Error(`Pipeline event count dropped from ${previous.length} to ${events.length}; last good data preserved.`);
  }

  const dates = Array.from({ length: 8 }, (_, offset) => {
    const date = new Date(now.valueOf() + offset * 24 * 3_600_000);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  });
  const days = dates.map((date) => scoreDay(date, events));
  const meta = {
    last_successful_run_at: now.toISOString(),
    source_counts: Object.fromEntries(settled.map(({ source, items }) => [source.name, items.length])),
    run_id: randomUUID(),
    schema_version: 1 as const
  };
  eventsFileSchema.parse(events); daysFileSchema.parse(days); reviewFileSchema.parse(review); metaSchema.parse(meta);

  const tempDir = path.join(dataDir, `.next-${meta.run_id}`);
  await mkdir(tempDir, { recursive: true });
  await writeJson(tempDir, 'events.json', events);
  await writeJson(tempDir, 'days.json', days);
  await writeJson(tempDir, 'review.json', review);
  await writeJson(tempDir, 'meta.json', meta);
  await exportEventsSpreadsheet(events, path.join(tempDir, 'events.xlsx'));
  for (const filename of ['events.json', 'days.json', 'review.json', 'meta.json', 'events.xlsx']) {
    await rename(path.join(tempDir, filename), path.join(dataDir, filename));
  }
  await rm(tempDir, { recursive: true, force: true });
}

async function writeJson(directory: string, filename: string, value: unknown): Promise<void> {
  await writeFile(path.join(directory, filename), `${JSON.stringify(value, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) throw new Error('TICKETMASTER_API_KEY is required. Existing published data was not changed.');
  await runPipeline([new TicketmasterSource(key)]);
}
