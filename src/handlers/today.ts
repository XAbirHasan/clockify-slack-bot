import type { Env } from '../env';
import type { SlackMessageEvent } from '../slack/types';
import { getTimeEntries } from '../clockify/api';
import { safePost, requireConfig } from './common';

const fmtDuration = (iso: string): string => {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!match) return iso;
  const h = parseInt(match[1] ?? '0', 10);
  const m = parseInt(match[2] ?? '0', 10);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

export async function handleToday(env: Env, event: SlackMessageEvent): Promise<void> {
  const config = await requireConfig(env, event);
  if (config === null) return;

  const now = new Date(parseFloat(event.ts) * 1000);
  let entries;
  try {
    entries = await getTimeEntries(config.workspaceId, config.clockifyUserId, config.clockifyApiKey, now);
  } catch (err) {
    console.error(`[today] ${event.user} failed to fetch entries: ${String(err)}`);
    await safePost(env, event.channel, 'Failed to fetch today\'s entries from Clockify.');
    return;
  }

  const user = `<@${event.user}>`;

  if (entries.length === 0) {
    await safePost(env, event.channel, `${user} No entries logged today yet.`);
    return;
  }

  const projectNameById = Object.fromEntries(
    Object.entries(config.projectMap).map(([name, id]) => [id, name]),
  );

  const lines = entries.map((e) => {
    const project = projectNameById[e.projectId] ?? e.projectId;
    const duration = fmtDuration(e.timeInterval.duration);
    const desc = e.description ? ` — ${e.description.split('\n')[0]}` : '';
    return `- *${project}* ${duration}${desc}`;
  });

  await safePost(env, event.channel, `${user} Today's entries:\n${lines.join('\n')}`);
}
