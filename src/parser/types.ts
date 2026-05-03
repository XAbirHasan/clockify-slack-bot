export interface ParsedEntry {
  project: string;
  durationMinutes: number;
  tasks: string[];
}

export interface ParseResult {
  entries: ParsedEntry[];
  date: string | undefined; // Optional global date header: yesterday, or DD-MM-YYYY
}
