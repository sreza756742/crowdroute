import { describe, expect, it } from 'vitest';
import { parseGoogleSheetCsv } from '../pipeline/sources/google-sheets';

describe('Google Sheet event source', () => {
  it('parses published rows, quoted commas and Auckland local time', () => {
    const csv = [
      'event_id,title,category,venue_name,venue_address,area,start_date,start_time,end_date,end_time,source_name,source_url,crowd_band,status,notes',
      ',"Cup Day, Auckland",racing,Ellerslie,"100 Ascot Avenue, Auckland",Auckland Central,2026-11-03,11:00,2026-11-03,20:00,Official,https://example.com/cup,,publish,"Public event"',
      ',Hidden Event,other,Venue,Address,Auckland Central,2026-11-03,12:00,,,Official,https://example.com/hidden,,review,Hold'
    ].join('\r\n');
    const events = parseGoogleSheetCsv(csv);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      title: 'Cup Day, Auckland', venueAddress: '100 Ascot Avenue, Auckland', venueArea: 'central',
      startAt: '2026-11-02T22:00:00.000Z', endAt: '2026-11-03T07:00:00.000Z', crowdBand: 'unknown'
    });
  });

  it('rejects a sheet whose required headers were renamed', () => {
    expect(() => parseGoogleSheetCsv('title,status\nEvent,publish')).toThrow(/missing required column/);
  });
});
