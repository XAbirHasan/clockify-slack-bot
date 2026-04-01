export interface ClockifyTimeEntryPayload {
  start: string;
  end: string;
  description: string;
  projectId: string;
}

export interface ClockifyTimeEntry {
  id: string;
  description: string;
  projectId: string;
  timeInterval: { start: string; end: string; duration: string };
}

export function isClockifyTimeEntry(obj: unknown): obj is ClockifyTimeEntry {
  if (!obj || typeof obj !== 'object') return false;
  const maybe = obj as Partial<ClockifyTimeEntry>;
  return typeof maybe.id === 'string'
    && typeof maybe.description === 'string'
    && typeof maybe.projectId === 'string'
    && typeof maybe.timeInterval === 'object'
    && maybe.timeInterval !== null;
}
