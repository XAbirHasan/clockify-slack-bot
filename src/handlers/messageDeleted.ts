import type { Env } from '../env';
import type { SlackMessageDeletedEvent } from '../slack/types';
import { getTodayEntries, deleteTimeEntry } from '../clockify/api';
import { tryLoadConfig } from '../store/ops';
import { parseMessage } from '../parser/message';
import { parseDate } from '../parser/date';

export async function handleMessageDeleted(env: Env, event: SlackMessageDeletedEvent): Promise<void> {
  const userId = event.previous_message?.user;
  const text = event.previous_message?.text;
  if (!userId || !text) {
    console.warn(`[delete] message_deleted event missing user or text — deleted_ts: ${event.deleted_ts}`);
    return;
  }

  const config = await tryLoadConfig(userId, env.USER_DATA, env.ENCRYPTION_KEY);
  if (config === null) {
    console.warn(`[delete] ${userId} no config found, skipping`);
    return;
  }

  const messageDate = new Date(parseFloat(event.deleted_ts) * 1000);
  const { date: dateStr } = parseMessage(text);
  const targetDate = dateStr ? parseDate(dateStr, messageDate) : messageDate;

  if (!targetDate) {
    console.warn(`[delete] ${userId} invalid date in deleted message: \`${dateStr}\``);
    return;
  }

  const dateKey = targetDate.toISOString().slice(0, 10);
  console.log(`[delete] ${userId} message deleted, clearing entries for ${dateKey}...`);

  let entries;
  try {
    entries = await getTodayEntries(config.workspaceId, config.clockifyUserId, config.clockifyApiKey, targetDate);
  } catch (err) {
    console.error(`[delete] ${userId} failed to fetch entries for ${dateKey}: ${String(err)}`);
    return;
  }

  if (entries.length === 0) {
    console.log(`[delete] ${userId} no entries found for ${dateKey}`);
    return;
  }

  try {
    await Promise.all(entries.map(e => deleteTimeEntry(config.workspaceId, e.id, config.clockifyApiKey)));
    console.log(`[delete] ${userId} cleared ${entries.length} Clockify entries for ${dateKey}`);
  } catch (err) {
    console.error(`[delete] ${userId} failed to clear entries for ${dateKey}: ${String(err)}`);
  }
}
