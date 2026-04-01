import type { Env } from './env';
import type { SlackMessageEvent } from './slack/types';
import type { SlackPayload } from './slack/types';
import { isSlackPayload, isSlackMessageEvent, isSlackMessageChangedEvent, isSlackMessageDeletedEvent } from './slack/types';
import { verifySlackSignature } from './slack/verify';
import { handleSetup } from './handlers/setup';
import { handleDailyUpdate } from './handlers/dailyUpdate';
import { handleHelp } from './handlers/help';
import { handleDeleteConfig } from './handlers/deleteConfig';
import { handleStatus } from './handlers/status';
import { handleToday } from './handlers/today';
import { handleUndo } from './handlers/undo';
import { handleMessageDeleted } from './handlers/messageDeleted';

type Handler = (env: Env, event: SlackMessageEvent) => Promise<void>;

// Strip a leading code-fence (``` or ```\n) so routing works whether or not
// the user wraps their message in a Slack code block.
const stripCodeFence = (cmd: string): string => cmd.replace(/^```/, '').trimStart();

const routes: Array<{ match: (cmd: string) => boolean; handler: Handler }> = [
  { match: (cmd) => ['help', 'help --setup', 'help --message'].includes(cmd), handler: handleHelp },
  { match: (cmd) => cmd === 'status',        handler: handleStatus },
  { match: (cmd) => cmd === 'today',         handler: handleToday },
  { match: (cmd) => cmd === 'undo',          handler: handleUndo },
  { match: (cmd) => cmd === 'delete config', handler: handleDeleteConfig },
  { match: (cmd) => stripCodeFence(cmd).startsWith('setup'), handler: handleSetup },
];

const resolveHandler = (cmd: string): Handler =>
  routes.find(({ match }) => match(cmd))?.handler ?? handleDailyUpdate;

/**
 * Normalise a raw Slack event into a SlackMessageEvent suitable for routing.
 * Returns null if the event should be ignored (bot message, unsupported subtype, etc).
 */
function normalizeEvent(raw: unknown): SlackMessageEvent | null {
  if (isSlackMessageChangedEvent(raw)) {
    const inner = raw.message;
    if (inner.bot_id !== undefined || inner.subtype !== undefined) return null;
    return { type: 'message', text: inner.text, user: inner.user, channel: raw.channel, ts: inner.ts, isEdit: true };
  }

  if (!isSlackMessageChangedEvent(raw)) {
    if (!isSlackMessageEvent(raw)) return null;
    if (raw.subtype !== undefined || raw.bot_id !== undefined) return null;
    return raw;
  }

  return null;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const rawBody = await request.text();
    let payload: SlackPayload;
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (!isSlackPayload(parsed)) return new Response('Bad Request', { status: 400 });
      payload = parsed;
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    if (payload.type === 'url_verification') {
      console.log('[slack] url verification');
      return Response.json({ challenge: payload.challenge });
    }

    const timestamp = request.headers.get('X-Slack-Request-Timestamp') ?? '';
    const signature = request.headers.get('X-Slack-Signature') ?? '';

    if (Math.abs(Date.now() / 1000 - parseInt(timestamp, 10)) > 300) {
      console.warn('[slack] rejected: timestamp too old');
      return new Response('Forbidden', { status: 403 });
    }
    if (!await verifySlackSignature(env.SLACK_SIGNING_SECRET, timestamp, rawBody, signature)) {
      console.warn('[slack] rejected: invalid signature');
      return new Response('Unauthorized', { status: 401 });
    }

    if (payload.type !== 'event_callback') return new Response('OK');

    const rawEvent = payload.event;

    if (isSlackMessageDeletedEvent(rawEvent)) {
      const userId = rawEvent.previous_message?.user;
      const deletedTs = rawEvent.deleted_ts;
      console.log(`[slack] message_deleted — user: ${userId}, ts: ${deletedTs}`);
      if (userId) {
        ctx.waitUntil(handleMessageDeleted(env, rawEvent));
      }
      return new Response('OK');
    }

    const event = normalizeEvent(rawEvent);
    if (event === null) return new Response('OK');

    if (env.RATE_LIMITER) {
      const { success } = await env.RATE_LIMITER.limit({ key: event.user });
      if (!success) {
        console.warn(`[slack] rate limited user ${event.user}`);
        return new Response('Too Many Requests', { status: 429 });
      }
    }

    const cmd = event.text.trim().toLowerCase();
    ctx.waitUntil(resolveHandler(cmd)(env, event));

    return new Response('OK');
  },
} satisfies ExportedHandler<Env>;
