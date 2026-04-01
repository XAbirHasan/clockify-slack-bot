import type { UserConfig } from '../store/types';
import { decodeSlackText } from './util';

/**
 * Parse a one-time setup message. Returns a partial config (without clockifyUserId) on success.
 * The caller is responsible for fetching and setting clockifyUserId via the Clockify API.
 *
 * Format:
 *   setup
 *   api_key: YOUR_CLOCKIFY_API_KEY
 *   workspace_id: YOUR_WORKSPACE_ID
 *   projects: my-project=CLOCKIFY_PROJECT_ID, another-project=CLOCKIFY_PROJECT_ID
 *   start_hour: 9
 */
export function parseSetup(raw: string): Omit<UserConfig, 'clockifyUserId'> | string {
  const decoded = decodeSlackText(raw).replace(/^```/, '').replace(/\n?```$/, '');
  const lines = decoded.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines[0]?.toLowerCase() !== 'setup') return 'not a setup message';

  const fields: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim().toLowerCase().replace(/[\s-]/g, '_');
    const val = line.slice(sep + 1).trim();
    if (val) fields[key] = val;
  }

  if (!fields['api_key']) return 'Missing `api_key`';
  if (!fields['workspace_id']) return 'Missing `workspace_id`';
  if (!fields['projects']) return 'Missing `projects`';

  const projectMap: Record<string, string> = {};
  for (const pair of fields['projects'].split(',')) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim().toLowerCase();
    const id = pair.slice(eq + 1).trim();
    if (name && id) projectMap[name] = id;
  }

  if (Object.keys(projectMap).length === 0) {
    return 'No valid projects found. Expected format: `projects: mimir=ID1, mimir-maintenance=ID2`';
  }

  const workStartHour = fields['start_hour'] ? parseInt(fields['start_hour'], 10) : 9;
  if (isNaN(workStartHour) || workStartHour < 0 || workStartHour > 23) {
    return '`start_hour` must be a number between 0 and 23 (UTC)';
  }

  return {
    clockifyApiKey: fields['api_key'],
    workspaceId: fields['workspace_id'],
    projectMap,
    workStartHour,
  };
}
