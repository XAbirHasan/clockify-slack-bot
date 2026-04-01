export interface SlackMessageEvent {
  type: 'message';
  subtype?: string;
  bot_id?: string;
  text: string;
  user: string;
  channel: string;
  ts: string;
  isEdit?: boolean;
}

interface SlackInnerMessage {
  text: string;
  user: string;
  ts: string;
  bot_id?: string;
  subtype?: string;
  edited?: { user: string; ts: string };
}

export interface SlackMessageChangedEvent {
  type: 'message';
  subtype: 'message_changed';
  channel: string;
  ts: string;
  message: SlackInnerMessage;
}

export interface SlackMessageDeletedEvent {
  type: 'message';
  subtype: 'message_deleted';
  channel: string;
  ts: string;
  deleted_ts: string;
  previous_message?: { text: string; user: string; ts: string };
}

export type SlackPayload =
  | { type: 'url_verification'; challenge: string }
  | { type: 'event_callback'; event: unknown };

export function isSlackMessageEvent(obj: unknown): obj is SlackMessageEvent {
  if (!obj || typeof obj !== 'object') return false;
  const maybe: Partial<SlackMessageEvent> = obj;
  return maybe.type === 'message'
    && typeof maybe.text === 'string'
    && typeof maybe.user === 'string'
    && typeof maybe.channel === 'string'
    && typeof maybe.ts === 'string';
}

export function isSlackMessageChangedEvent(obj: unknown): obj is SlackMessageChangedEvent {
  if (!obj || typeof obj !== 'object') return false;
  const maybe: Partial<SlackMessageChangedEvent> = obj;
  if (maybe.type !== 'message' || maybe.subtype !== 'message_changed') return false;
  if (typeof maybe.channel !== 'string' || typeof maybe.ts !== 'string') return false;
  if (!maybe.message || typeof maybe.message !== 'object') return false;
  const msg = maybe.message as Partial<SlackInnerMessage>;
  return typeof msg.text === 'string' && typeof msg.user === 'string' && typeof msg.ts === 'string'
    && msg.edited !== undefined;
}

export function isSlackMessageDeletedEvent(obj: unknown): obj is SlackMessageDeletedEvent {
  if (!obj || typeof obj !== 'object') return false;
  const maybe = obj as Partial<SlackMessageDeletedEvent>;
  return maybe.type === 'message'
    && maybe.subtype === 'message_deleted'
    && typeof maybe.channel === 'string'
    && typeof maybe.deleted_ts === 'string';
}

export function isSlackPayload(obj: unknown): obj is SlackPayload {
  if (!obj || typeof obj !== 'object') return false;
  if (!('type' in obj)) return false;
  if (obj.type === 'url_verification') {
    return 'challenge' in obj && typeof obj.challenge === 'string';
  }
  if (obj.type === 'event_callback') {
    return 'event' in obj && obj.event !== null && typeof obj.event === 'object';
  }
  return false;
}
