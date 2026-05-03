import type { Env } from '../env';
import type { SlackMessageEvent } from '../slack/types';
import type { UserConfig } from '../store/types';
import { loadConfig } from '../store/ops';
import { postMessage } from '../slack/api';

export const CONFIG_INVALID_MSG =
  'Your saved config could not be decrypted (possibly due to a server key change). ' +
  'Please run `delete config` then `setup` again to restore access.';

export const SETUP_PROMPT =
  'First-time setup required. Send this once with your own values:\n' +
  '```\n' +
  'setup\n' +
  'api_key: YOUR_CLOCKIFY_API_KEY\n' +

  'workspace_id: YOUR_WORKSPACE_ID\n' +
  'projects: my-project=CLOCKIFY_PROJECT_ID, another-project=CLOCKIFY_PROJECT_ID\n' +
  'start_hour: 9\n' +
  '```\n' +
  '_Note: `start_hour` is in UTC. Bangladesh (UTC+6) → 9am = `start_hour: 3`_\n' +
  'Type `help` to see all instructions.';

export function buildSetupHelpText(): string {
  return (
    '*First-time setup* — send this once, then *delete the message yourself*:\n' +
    '```\n' +
    'setup\n' +
    'api_key: YOUR_CLOCKIFY_API_KEY\n' +
    'workspace_id: YOUR_WORKSPACE_ID\n' +
    'projects: my-project=CLOCKIFY_PROJECT_ID, another-project=CLOCKIFY_PROJECT_ID\n' +
    'start_hour: 9\n' +
    '```\n' +
    '• `api_key` — Clockify profile → API key\n' +
    '• `workspace_id` — Clockify workspace settings → General\n' +
    '• `projects` — comma-separated `name=clockify_project_id` pairs\n' +
    '• `start_hour` — work day start in UTC (e.g. `9` = 09:00 UTC). BD time (UTC+6): 9am = `3`'
  );
}

export function buildMessageHelpText(config: UserConfig | null): string {
  const projectNames = config
    ? Object.keys(config.projectMap)
    : ['my-project', 'another-project'];

  const exampleLines = projectNames
    .map((name, i) => `[${name}] [${i === 0 ? '6h' : '2h'}]\n1. Task one\n2. Task two`)
    .join('\n\n');

  return (
    '*Daily update* — send any time:\n' +
    '```\n' +
    '[yesterday]\n\n' +
    exampleLines + '\n' +
    '```\n' +
    '• Optional top header: `[today]`, `[yesterday]`, or `[DD-MM-YYYY]`\n' +
    '• Duration formats: `8h` `30m` `8h30m` `8:30` `8.5`'
  );
}

export function buildHelpText(config: UserConfig | null): string {
  return (
    '*Clockify bot*\n\n' +
    buildSetupHelpText() + '\n\n' +
    buildMessageHelpText(config) + '\n\n' +
    '*Other commands:* `help` — `help --setup` — `help --message` — `status` — `today` — `undo` — `delete config`'
  );
}

export async function safePost(env: Env, channel: string, text: string): Promise<void> {
  try {
    await postMessage(channel, text, env.SLACK_BOT_TOKEN);
  } catch (err) {
    console.error('[slack] failed to post message:', String(err));
  }
}

/**
 * Loads the user's config and handles all error cases by posting a message.
 * Returns null if the caller should abort (message already sent to the user).
 */
export async function requireConfig(env: Env, event: SlackMessageEvent): Promise<UserConfig | null> {
  let config: UserConfig | null;
  try {
    config = await loadConfig(event.user, env.USER_DATA, env.ENCRYPTION_KEY);
  } catch {
    await safePost(env, event.channel, `<@${event.user}> ${CONFIG_INVALID_MSG}`);
    return null;
  }
  if (config === null) {
    await safePost(env, event.channel, SETUP_PROMPT);
    return null;
  }
  return config;
}
