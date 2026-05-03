import { describe, it, expect } from 'vitest';
import { parseDate } from '../../src/parser/date';

function getStartOfUtcDay(date: Date, offsetDays = 0): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toInputFormat(date: Date): string {
  const day = date.getUTCDate().toString().padStart(2, '0');
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

describe('parseDate', () => {
  const base = new Date('2024-05-03T15:30:45Z');

  describe('Relative Dates', () => {
    it('parses "today" correctly relative to any base date', () => {
      const result = parseDate('today', base);
      expect(result?.toISOString()).toBe(getStartOfUtcDay(base).toISOString());
    });

    it('parses "yesterday" correctly relative to any base date', () => {
      const result = parseDate('yesterday', base);
      expect(result?.toISOString()).toBe(getStartOfUtcDay(base, -1).toISOString());
    });

    it('handles "today" even at the very end of the day', () => {
      const lateBase = new Date('2024-05-03T23:59:59Z');
      const result = parseDate('today', lateBase);
      expect(result?.toISOString()).toBe(getStartOfUtcDay(lateBase).toISOString());
    });

    it('handles "today" even at the very beginning of the day', () => {
      const earlyBase = new Date('2024-05-03T00:00:01Z');
      const result = parseDate('today', earlyBase);
      expect(result?.toISOString()).toBe(getStartOfUtcDay(earlyBase).toISOString());
    });
  });

  describe('Absolute Dates (DD-MM-YYYY)', () => {
    it('parses a specific date string correctly', () => {
      const target = new Date('2024-04-10T00:00:00Z');
      const result = parseDate(toInputFormat(target), base);
      expect(result?.toISOString()).toBe(target.toISOString());
    });

    it('returns null for invalid calendar dates (e.g., Feb 31st)', () => {
      expect(parseDate('31-02-2024', base)).toBeNull();
    });

    it('returns null for non-date strings', () => {
      expect(parseDate('not-a-date', base)).toBeNull();
      expect(parseDate('123', base)).toBeNull();
    });
  });

  describe('Range Validation (60-day limit)', () => {
    it('accepts a date exactly 60 days in the past', () => {
      const sixtyDaysAgo = getStartOfUtcDay(base, -60);
      const result = parseDate(toInputFormat(sixtyDaysAgo), base);
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe(sixtyDaysAgo.toISOString());
    });

    it('rejects a date 61 days in the past', () => {
      const sixtyOneDaysAgo = getStartOfUtcDay(base, -61);
      expect(parseDate(toInputFormat(sixtyOneDaysAgo), base)).toBeNull();
    });

    it('rejects future dates (tomorrow)', () => {
      const tomorrow = getStartOfUtcDay(base, 1);
      expect(parseDate(toInputFormat(tomorrow), base)).toBeNull();
    });
  });

  describe('Calendar Edge Cases', () => {
    it('handles month boundaries correctly (March 1st -> Feb 29th)', () => {
      const marchFirst = new Date('2024-03-01T12:00:00Z');
      const result = parseDate('yesterday', marchFirst);
      expect(result?.getUTCMonth()).toBe(1);
      expect(result?.getUTCDate()).toBe(29);
    });

    it('handles year boundaries correctly (Jan 1st -> Dec 31st)', () => {
      const janFirst = new Date('2024-01-01T12:00:00Z');
      const result = parseDate('yesterday', janFirst);
      expect(result?.getUTCFullYear()).toBe(2023);
      expect(result?.getUTCMonth()).toBe(11);
      expect(result?.getUTCDate()).toBe(31);
    });
  });
});
