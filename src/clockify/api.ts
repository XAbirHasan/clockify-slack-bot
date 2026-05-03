import type { ClockifyTimeEntryPayload, ClockifyTimeEntry } from './types';
import { isClockifyTimeEntry } from './types';

const BASE_URL = 'https://api.clockify.me/api/v1';

export async function getClockifyUserId(apiKey: string): Promise<string> {
  const resp = await fetch(`${BASE_URL}/user`, { headers: { 'X-Api-Key': apiKey } });
  if (!resp.ok) throw new Error(`Clockify getUser failed: ${resp.status}`);
  const json = await resp.json() as { id: string };
  return json.id;
}

export async function createTimeEntry(
  workspaceId: string,
  apiKey: string,
  entry: ClockifyTimeEntryPayload,
): Promise<void> {
  const url = `${BASE_URL}/workspaces/${workspaceId}/time-entries`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!resp.ok) {
    throw new Error(`Clockify createTimeEntry failed: ${resp.status} ${await resp.text()}`);
  }
}

export async function getTimeEntries(
  workspaceId: string,
  userId: string,
  apiKey: string,
  date: Date,
): Promise<ClockifyTimeEntry[]> {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)).toISOString();
  const url = `${BASE_URL}/workspaces/${workspaceId}/user/${userId}/time-entries?start=${start}&end=${end}`;
  const resp = await fetch(url, { headers: { 'X-Api-Key': apiKey } });
  if (!resp.ok) throw new Error(`Clockify getTimeEntries failed: ${resp.status}`);
  const json = await resp.json() as unknown[];
  return json.filter(isClockifyTimeEntry);
}

export async function deleteTimeEntry(
  workspaceId: string,
  entryId: string,
  apiKey: string,
): Promise<void> {
  const url = `${BASE_URL}/workspaces/${workspaceId}/time-entries/${entryId}`;
  const resp = await fetch(url, { method: 'DELETE', headers: { 'X-Api-Key': apiKey } });
  if (!resp.ok) throw new Error(`Clockify deleteTimeEntry failed: ${resp.status}`);
}
