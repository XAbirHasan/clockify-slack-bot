/**
 * Parse a date string into a Date object.
 * Supports:
 * - DD-MM-YYYY (e.g. 05-03-2024)
 * - today
 * - yesterday
 * Returns null if the format is invalid, if the date is in the future,
 * or if the date is more than 60 days in the past.
 */
export function parseDate(str: string, baseDate: Date): Date | null {
  const s = str.toLowerCase().trim();
  let targetDate: Date | null = null;

  if (s === 'today') {
    targetDate = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate()));
  } else if (s === 'yesterday') {
    targetDate = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate() - 1));
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

  const targetTime = Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate());
  const baseTime = Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate());

  const diffDays = (baseTime - targetTime) / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return null;
  if (diffDays > 60) return null;

  return targetDate;
}
