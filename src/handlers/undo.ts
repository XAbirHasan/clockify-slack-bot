import type { Env } from '../env';
import type { SlackMessageEvent } from '../slack/types';
import { getTodayEntries, deleteTimeEntry } from '../clockify/api';
import { safePost, requireConfig } from './common';

export async function handleUndo(env: Env, event: SlackMessageEvent): Promise<void> {
  const config = await requireConfig(env, event);
  if (config === null) return;

  const now = new Date(parseFloat(event.ts) * 1000);
  let entries;
  try {
    entries = await getTodayEntries(config.workspaceId, config.clockifyUserId, config.clockifyApiKey, now);
  } catch (err) {
    console.error(`[undo] ${event.user} failed to fetch entries: ${String(err)}`);
    await safePost(env, event.channel, 'Failed to fetch entries from Clockify.');
    return;
  }

  if (entries.length === 0) {
    await safePost(env, event.channel, `<@${event.user}> Nothing to undo — no entries logged today.`);
    return;
  }

  try {
    await Promise.all(entries.map(e => deleteTimeEntry(config.workspaceId, e.id, config.clockifyApiKey)));
    const idToName = Object.fromEntries(Object.entries(config.projectMap).map(([k, v]) => [v, k]));
    const names = entries.map(e => `*${idToName[e.projectId] ?? e.projectId}*`).join(', ');
    console.log(`[undo] deleted ${entries.length} entries for user ${event.user}`);
    await safePost(env, event.channel, `<@${event.user}> Deleted ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}: ${names}`);
  } catch (err) {
    console.error(`[undo] ${event.user} failed to delete entries: ${String(err)}`);
    await safePost(env, event.channel, 'Failed to delete entries.');
  }
}
