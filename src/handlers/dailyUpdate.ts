import type { Env } from '../env';
import type { SlackMessageEvent } from '../slack/types';
import { createTimeEntry, getTodayEntries, deleteTimeEntry } from '../clockify/api';
import { parseMessage } from '../parser/message';
import { parseDate } from '../parser/date';
import { safePost, requireConfig } from './common';
import { addReaction } from '../slack/api';

const fmtTime = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
};

const fmtDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

export async function handleDailyUpdate(env: Env, event: SlackMessageEvent): Promise<void> {
  const { date: dateStr, entries } = parseMessage(event.text);
  if (entries.length === 0) return;
  console.log(`[update] ${event.user} in ${event.channel} — ${entries.length} block(s)`);


  const config = await requireConfig(env, event);
  if (config === null) return;

  const messageDate = new Date(parseFloat(event.ts) * 1000);
  const targetDate = dateStr ? parseDate(dateStr, messageDate) : messageDate;

  if (!targetDate) {
    await safePost(env, event.channel, `<@${event.user}> Invalid date: \`${dateStr}\`. Use \`DD-MM-YYYY\`, \`today\`, or \`yesterday\` (max 60 days ago).`);
    return;
  }

  const dateKey = targetDate.toISOString().slice(0, 10);
  console.log(`[clockify] ${event.user} processing ${entries.length} entries for ${dateKey}`);

  try {
    const existing = await getTodayEntries(config.workspaceId, config.clockifyUserId, config.clockifyApiKey, targetDate);
    if (existing.length > 0) {
      console.log(`[clockify] ${event.user} clearing ${existing.length} existing entries for ${dateKey}`);
      await Promise.all(existing.map(e => deleteTimeEntry(config.workspaceId, e.id, config.clockifyApiKey)));
    }
  } catch (err) {
    console.error(`[clockify] ${event.user} failed to clear entries for ${dateKey}: ${String(err)}`);
    await safePost(env, event.channel, `Failed to clear existing entries for ${dateKey}. Aborting.`);
    return;
  }

  let cursorMs = Date.UTC(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate(),
    config.workStartHour, 0, 0, 0,
  );

  const logged: string[] = [];
  const failed: string[] = [];

  for (const entry of entries) {
    const projectId = config.projectMap[entry.project.toLowerCase()];
    if (!projectId) {
      console.warn(`[clockify] ${event.user} unknown project: "${entry.project}"`);
      failed.push(`- Unknown project: \`${entry.project}\``);
      continue;
    }

    const startMs = cursorMs;
    const endMs = startMs + entry.durationMinutes * 60_000;
    cursorMs = endMs;

    const description = entry.tasks.length > 0
      ? entry.tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')
      : entry.project;

    try {
      await createTimeEntry(config.workspaceId, config.clockifyApiKey, {
        start: new Date(startMs).toISOString(),
        end: new Date(endMs).toISOString(),
        description,
        projectId,
      });
      console.log(`[clockify] ${event.user} logged "${entry.project}" ${fmtDuration(entry.durationMinutes)} (${fmtTime(startMs)}-${fmtTime(endMs)})`);
      logged.push(`- *${entry.project}* — ${fmtDuration(entry.durationMinutes)} (${fmtTime(startMs)}–${fmtTime(endMs)})`);
    } catch (err) {
      console.error(`[clockify] ${event.user} failed to log "${entry.project}": ${String(err)}`);
      failed.push(`- Failed: \`${entry.project}\` — ${String(err)}`);
    }
  }

  if (logged.length > 0) {
    const emoji = event.isEdit ? 'arrows_counterclockwise' : 'white_check_mark';
    try {
      await addReaction(event.channel, event.ts, emoji, env.SLACK_BOT_TOKEN);
    } catch (err) {
      console.error(`[slack] ${event.user} failed to add reaction: ${String(err)}`);
    }
  }
  if (failed.length > 0) {
    await safePost(env, event.channel, `<@${event.user}> Some entries failed for ${dateKey}:\n${failed.join('\n')}`);
  }
}
