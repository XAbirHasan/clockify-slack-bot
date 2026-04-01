import type { Env } from '../env';
import type { SlackMessageDeletedEvent } from '../slack/types';
import { getTodayEntries, deleteTimeEntry } from '../clockify/api';
import { tryLoadConfig } from '../store/ops';

export async function handleMessageDeleted(env: Env, event: SlackMessageDeletedEvent): Promise<void> {
  const userId = event.previous_message?.user;
  if (!userId) {
    console.warn(`[delete] message_deleted event missing previous_message.user — deleted_ts: ${event.deleted_ts}`);
    return;
  }

  const config = await tryLoadConfig(userId, env.USER_DATA, env.ENCRYPTION_KEY);
  if (config === null) {
    console.warn(`[delete] ${userId} no config found, skipping`);
    return;
  }

  const messageDate = new Date(parseFloat(event.deleted_ts) * 1000);
  console.log(`[delete] ${userId} deleted message at ${messageDate.toISOString()}, fetching entries...`);

  let entries;
  try {
    entries = await getTodayEntries(config.workspaceId, config.clockifyUserId, config.clockifyApiKey, messageDate);
  } catch (err) {
    console.error(`[delete] ${userId} failed to fetch entries: ${String(err)}`);
    return;
  }

  if (entries.length === 0) {
    console.log(`[delete] ${userId} no entries found for ${messageDate.toISOString().slice(0, 10)}`);
    return;
  }

  try {
    await Promise.all(entries.map(e => deleteTimeEntry(config.workspaceId, e.id, config.clockifyApiKey)));
    console.log(`[delete] ${userId} cleared ${entries.length} Clockify entries`);
  } catch (err) {
    console.error(`[delete] ${userId} failed to clear entries: ${String(err)}`);
  }
}
