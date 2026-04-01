import type { Env } from '../env';
import type { SlackMessageEvent } from '../slack/types';
import { getClockifyUserId } from '../clockify/api';
import { tryLoadConfig, saveConfig } from '../store/ops';
import { parseSetup } from '../parser/setup';
import { safePost } from './common';

export async function handleSetup(env: Env, event: SlackMessageEvent): Promise<void> {
  const result = parseSetup(event.text);
  if (result === 'not a setup message') return;

  if (typeof result === 'string') {
    await safePost(env, event.channel, `Setup failed: ${result}`);
    return;
  }

  const existing = await tryLoadConfig(event.user, env.USER_DATA, env.ENCRYPTION_KEY);

  let clockifyUserId: string;
  try {
    clockifyUserId = await getClockifyUserId(result.clockifyApiKey);
  } catch {
    await safePost(env, event.channel, 'Could not verify your Clockify API key. Please check it and try again.');
    return;
  }

  await saveConfig(event.user, { ...result, clockifyUserId }, env.USER_DATA, env.ENCRYPTION_KEY);

  const projects = Object.keys(result.projectMap).join(', ');
  const action = existing ? 'Config updated' : 'Setup complete';
  console.log(`[setup] ${action.toLowerCase()} for user ${event.user} — projects: ${projects}`);

  await safePost(
    env,
    event.channel,
    `<@${event.user}> ${action}. Projects: ${projects} — work starts at ${result.workStartHour}:00 UTC\n:warning: Please delete your setup message manually to keep your API key out of history.`,
  );
}
