import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatTime,
  getDateKey,
  isToday,
  isTomorrow,
} from '@/lib/formatDate';

describe('dashboard date rendering', () => {
  const meetingDate = '2026-10-18T17:30:00.000Z';
  const renderTimestamp = new Date('2026-10-18T18:00:00.000Z');

  it('produces the same labels across server and browser time zones', () => {
    const originalTimeZone = process.env.TZ;

    try {
      process.env.TZ = 'UTC';
      const serverOutput = [
        formatDate(meetingDate),
        formatDateTime(meetingDate),
        formatTime(meetingDate),
        isToday(meetingDate, renderTimestamp),
        isTomorrow('2026-10-19T17:30:00.000Z', renderTimestamp),
      ];

      process.env.TZ = 'America/Los_Angeles';
      const browserOutput = [
        formatDate(meetingDate),
        formatDateTime(meetingDate),
        formatTime(meetingDate),
        isToday(meetingDate, renderTimestamp),
        isTomorrow('2026-10-19T17:30:00.000Z', renderTimestamp),
      ];

      expect(browserOutput).toEqual(serverOutput);
      expect(serverOutput[0]).toContain('19 Oktober 2026');
      expect(serverOutput[3]).toBe(true);
      expect(serverOutput[4]).toBe(true);
    } finally {
      if (originalTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimeZone;
    }
  });

  it('formats selected date styles and calendar keys in WIB', () => {
    const meetingDate = '2026-10-18T17:30:00.000Z';
    const originalTimeZone = process.env.TZ;

    try {
      process.env.TZ = 'UTC';
      const utcOutput = [
        formatDate(meetingDate, { day: '2-digit', month: '2-digit', year: 'numeric' }),
        getDateKey(new Date(meetingDate)),
      ];

      process.env.TZ = 'Australia/Sydney';
      const sydneyOutput = [
        formatDate(meetingDate, { day: '2-digit', month: '2-digit', year: 'numeric' }),
        getDateKey(new Date(meetingDate)),
      ];

      expect(sydneyOutput).toEqual(utcOutput);
      expect(utcOutput).toEqual(['19/10/2026', '2026-10-19']);
    } finally {
      if (originalTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimeZone;
    }
  });
});
