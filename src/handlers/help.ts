import type { Env } from '../env';
import type { SlackMessageEvent } from '../slack/types';
import { tryLoadConfig } from '../store/ops';
import { safePost, buildHelpText, buildSetupHelpText, buildMessageHelpText } from './common';

export async function handleHelp(env: Env, event: SlackMessageEvent): Promise<void> {
  const text = event.text.trim();
  if (text === 'help --setup') {
    await safePost(env, event.channel, buildSetupHelpText());
    return;
  }
  if (text === 'help --message') {
    const config = await tryLoadConfig(event.user, env.USER_DATA, env.ENCRYPTION_KEY);
    await safePost(env, event.channel, buildMessageHelpText(config));
    return;
  }
  const config = await tryLoadConfig(event.user, env.USER_DATA, env.ENCRYPTION_KEY);
  await safePost(env, event.channel, buildHelpText(config));
}
