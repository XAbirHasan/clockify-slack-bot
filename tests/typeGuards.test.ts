import { describe, it, expect } from 'vitest';
import { isSlackPayload, isSlackMessageEvent, isSlackMessageChangedEvent } from '../src/slack/types';
import { isUserConfig } from '../src/store/types';

describe('isSlackPayload', () => {
  it('accepts url_verification payload', () => {
    expect(isSlackPayload({ type: 'url_verification', challenge: 'abc' })).toBe(true);
  });

  it('accepts event_callback with valid event', () => {
    expect(isSlackPayload({
      type: 'event_callback',
      event: { type: 'message', text: 'hi', user: 'U1', channel: 'C1', ts: '123' },
    })).toBe(true);
  });

  it('accepts event_callback with message_changed event', () => {
    expect(isSlackPayload({
      type: 'event_callback',
      event: { type: 'message', subtype: 'message_changed', channel: 'C1', ts: '124',
        message: { text: 'edited', user: 'U1', ts: '123' } },
    })).toBe(true);
  });

  it('rejects url_verification without challenge', () => {
    expect(isSlackPayload({ type: 'url_verification' })).toBe(false);
  });

  it('rejects event_callback without event field', () => {
    expect(isSlackPayload({ type: 'event_callback' })).toBe(false);
  });

  it('rejects unknown type', () => {
    expect(isSlackPayload({ type: 'something_else' })).toBe(false);
  });

  it('rejects null', () => {
    expect(isSlackPayload(null)).toBe(false);
  });

  it('rejects non-object', () => {
    expect(isSlackPayload('string')).toBe(false);
    expect(isSlackPayload(42)).toBe(false);
  });
});

describe('isSlackMessageEvent', () => {
  const valid = { type: 'message', text: 'hi', user: 'U1', channel: 'C1', ts: '123' };

  it('accepts a valid message event', () => {
    expect(isSlackMessageEvent(valid)).toBe(true);
  });

  it('accepts event with optional fields present', () => {
    expect(isSlackMessageEvent({ ...valid, subtype: 'bot_message', bot_id: 'B1' })).toBe(true);
  });

  it('rejects missing required fields', () => {
    const { text: _text, ...withoutText } = valid;
    expect(isSlackMessageEvent(withoutText)).toBe(false);
  });

  it('rejects wrong type value', () => {
    expect(isSlackMessageEvent({ ...valid, type: 'reaction_added' })).toBe(false);
  });
});

describe('isSlackMessageChangedEvent', () => {
  const valid = {
    type: 'message',
    subtype: 'message_changed',
    channel: 'C1',
    ts: '124',
    message: { text: 'updated text', user: 'U1', ts: '123', edited: { user: 'U1', ts: '125' } },
  };

  it('accepts a valid message_changed event', () => {
    expect(isSlackMessageChangedEvent(valid)).toBe(true);
  });

  it('rejects if subtype is not message_changed', () => {
    expect(isSlackMessageChangedEvent({ ...valid, subtype: 'bot_message' })).toBe(false);
  });

  it('rejects if message is missing', () => {
    const { message: _m, ...rest } = valid;
    expect(isSlackMessageChangedEvent(rest)).toBe(false);
  });

  it('rejects if inner message is missing text', () => {
    expect(isSlackMessageChangedEvent({ ...valid, message: { user: 'U1', ts: '123' } })).toBe(false);
  });

  it('rejects null', () => {
    expect(isSlackMessageChangedEvent(null)).toBe(false);
  });
});

describe('isUserConfig', () => {
  const valid = {
    clockifyApiKey: 'key',
    clockifyUserId: 'uid',
    workspaceId: 'ws',
    projectMap: { mimir: 'pid1' },
    workStartHour: 9,
  };

  it('accepts a valid config', () => {
    expect(isUserConfig(valid)).toBe(true);
  });

  it('accepts empty projectMap', () => {
    expect(isUserConfig({ ...valid, projectMap: {} })).toBe(true);
  });

  it('rejects missing clockifyApiKey', () => {
    const { clockifyApiKey: _k, ...rest } = valid;
    expect(isUserConfig(rest)).toBe(false);
  });

  it('rejects non-string values in projectMap', () => {
    expect(isUserConfig({ ...valid, projectMap: { mimir: 123 } })).toBe(false);
  });

  it('rejects non-number workStartHour', () => {
    expect(isUserConfig({ ...valid, workStartHour: '9' })).toBe(false);
  });

  it('rejects null', () => {
    expect(isUserConfig(null)).toBe(false);
  });
});
