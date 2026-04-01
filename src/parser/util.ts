/** Shared by message.ts and setup.ts — decodes Slack-encoded text. */
export const decodeSlackText = (text: string): string =>
  text
    // Slack link: <https://url|display text> → display text (or URL if no label)
    .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '$2')
    .replace(/<(https?:\/\/[^>]+)>/g, '$1')
    // User mention: <@U123456> → @U123456
    .replace(/<@([A-Z0-9]+)>/g, '@$1')
    // Channel mention: <#C123456|channel-name> → #channel-name
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1')
    // HTML entities
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

