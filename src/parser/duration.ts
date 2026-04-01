// Supported: 8h | 30m | 8h30m | 8h 30m | 8:30 | 8.5
export function parseDuration(raw: string): number | null {
  const s = raw.toLowerCase().trim();

  const colonMatch = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (colonMatch) return parseInt(colonMatch[1]!, 10) * 60 + parseInt(colonMatch[2]!, 10);

  const decimalMatch = /^(\d+\.\d+)$/.exec(s);
  if (decimalMatch) return Math.round(parseFloat(decimalMatch[1]!) * 60);

  const hmMatch = /^(?:(\d+)h)?\s*(?:(\d+)m)?$/.exec(s);
  if (hmMatch) {
    const h = hmMatch[1] !== undefined ? parseInt(hmMatch[1], 10) : 0;
    const m = hmMatch[2] !== undefined ? parseInt(hmMatch[2], 10) : 0;
    if (h > 0 || m > 0) return h * 60 + m;
  }

  return null;
}
