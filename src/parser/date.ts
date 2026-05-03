const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Parse a date string into a Date object.
 * Supports:
 * - DD-MM-YYYY or D-M-YYYY (e.g. 05-03-2024 or 5-3-2024)
 * - yesterday
 * Returns null if the format is invalid, if the date is in the future,
 * or if the date is more than 60 days in the past.
 */
export function parseDate(str: string, baseDate: Date): Date | null {
  const s = str.toLowerCase().trim();
  const baseTime = Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate());
  let targetDate: Date | null = null;

  if (s === 'yesterday') {
    targetDate = new Date(baseTime - MS_PER_DAY);
  } else {
    const match = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(s);

    if (match) {
      const day = parseInt(match[1]!, 10);
      const month = parseInt(match[2]!, 10) - 1;
      const year = parseInt(match[3]!, 10);
      const d = new Date(Date.UTC(year, month, day));
      if (d.getUTCFullYear() === year && d.getUTCMonth() === month && d.getUTCDate() === day) {
        targetDate = d;
      }
    }
  }

  if (!targetDate) return null;

  const diffDays = (baseTime - targetDate.getTime()) / MS_PER_DAY;
  if (diffDays < 0 || diffDays > 60) return null;

  return targetDate;
}