import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runPipeline } from '../pipeline';
import type { EventSource } from '../pipeline/types';
import { daysFileSchema, eventsFileSchema, metaSchema, reviewFileSchema, type Venue } from '../src/lib/schemas';

const temporaryDirectories: string[] = [];
const venue: Venue = { id: 'spark-arena', name: 'Spark Arena', address: '42 Mahuhu Crescent', lat: -36.8472, lng: 174.776, area: 'central', capacity: null, notes: null };

async function makeDataDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'driver-events-'));
  temporaryDirectories.push(directory);
  await writeFile(path.join(directory, 'venues.json'), JSON.stringify([venue]));
  await writeFile(path.join(directory, 'events.json'), '[]');
  return directory;
}

afterEach(async () => { await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

describe('complete pipeline publication', () => {
  it('writes every validated artifact from a structured source', async () => {
    const directory = await makeDataDirectory();
    const source: EventSource = { name: 'Fixture API', fetch: async () => [{
      sourceId: 'fixture-1', title: 'Fixture Concert', category: 'concert', venueName: 'Spark Arena',
      startAt: '2026-11-04T06:30:00.000Z', sourceName: 'Fixture API', sourceUrl: 'https://example.com/fixture', confidence: .95, raw: {}
    }] };
    await runPipeline([source], new Date('2026-11-03T00:00:00.000Z'), directory);
    expect(eventsFileSchema.parse(JSON.parse(await readFile(path.join(directory, 'events.json'), 'utf8')))).toHaveLength(1);
    expect(daysFileSchema.parse(JSON.parse(await readFile(path.join(directory, 'days.json'), 'utf8')))).toHaveLength(8);
    expect(reviewFileSchema.parse(JSON.parse(await readFile(path.join(directory, 'review.json'), 'utf8')))).toEqual([]);
    expect(metaSchema.parse(JSON.parse(await readFile(path.join(directory, 'meta.json'), 'utf8'))).source_counts).toEqual({ 'Fixture API': 1 });
    expect((await readFile(path.join(directory, 'events.xlsx'))).byteLength).toBeGreaterThan(1_000);
  });

  it('leaves last-good event data untouched when a source produces zero events', async () => {
    const directory = await makeDataDirectory();
    const original = '[{"last_good":true}]';
    await writeFile(path.join(directory, 'events.json'), original);
    const source: EventSource = { name: 'Broken API', fetch: async () => [] };
    await expect(runPipeline([source], new Date('2026-11-03T00:00:00.000Z'), directory)).rejects.toThrow(/zero/);
    expect(await readFile(path.join(directory, 'events.json'), 'utf8')).toBe(original);
  });
});
