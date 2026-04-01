import type { Env } from '../env';
import type { SlackMessageEvent } from '../slack/types';
import { safePost } from './common';

export async function handleDeleteConfig(env: Env, event: SlackMessageEvent): Promise<void> {
  const existing = await env.USER_DATA.get(event.user);
  const user = `<@${event.user}>`;
  if (existing === null) {
    await safePost(env, event.channel, `${user} No config found for your account.`);
    return;
  }
  await env.USER_DATA.delete(event.user);
  console.log(`[setup] deleted config for user ${event.user}`);
  await safePost(env, event.channel, `${user} Config deleted. Send \`setup\` to configure again.`);
}
