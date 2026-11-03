import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ExcelJS from 'exceljs';
import { eventsFileSchema, type Event } from '../src/lib/schemas.js';

export async function exportEventsSpreadsheet(events: Event[], destination: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Auckland Driver Events pipeline';
  const sheet = workbook.addWorksheet('Events');
  const columns = events.length > 0 ? Object.keys(events[0]) : ['id', 'title', 'category', 'venue_id', 'start_at', 'est_end_at', 'source_url'];
  sheet.columns = columns.map((key) => ({ header: key, key, width: key.includes('url') ? 45 : 22 }));
  sheet.addRows(events);
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, events.length + 1), column: columns.length } };
  await workbook.xlsx.writeFile(destination);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const events = eventsFileSchema.parse(JSON.parse(await readFile(path.resolve('data/events.json'), 'utf8')));
  await exportEventsSpreadsheet(events, path.resolve('data/events.xlsx'));
}
