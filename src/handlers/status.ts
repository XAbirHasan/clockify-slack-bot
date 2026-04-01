import type { Env } from '../env';
import type { SlackMessageEvent } from '../slack/types';
import { safePost, requireConfig } from './common';

export async function handleStatus(env: Env, event: SlackMessageEvent): Promise<void> {
  const config = await requireConfig(env, event);
  if (config === null) return;

  const projects = Object.entries(config.projectMap)
    .map(([name, id]) => `  • ${name} — \`${id}\``)
    .join('\n');

  await safePost(
    env,
    event.channel,
    `<@${event.user}> *Your config:*\nWorkspace: \`${config.workspaceId}\`\nWork starts at: ${config.workStartHour}:00 UTC\nProjects:\n${projects}`,
  );
}
