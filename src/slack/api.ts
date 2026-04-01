function slackHeaders(botToken: string): Record<string, string> {
  return { Authorization: `Bearer ${botToken}`, 'Content-Type': 'application/json' };
}

export async function postMessage(channel: string, text: string, botToken: string): Promise<void> {
  const resp = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: slackHeaders(botToken),
    body: JSON.stringify({ channel, text, mrkdwn: true }),
  });
  if (!resp.ok) throw new Error(`Slack postMessage HTTP error: ${resp.status}`);
  const json = (await resp.json()) as { ok: boolean; error?: string };
  if (!json.ok) throw new Error(`Slack postMessage API error: ${json.error ?? 'unknown'}`);
}

export async function addReaction(channel: string, ts: string, emoji: string, botToken: string): Promise<void> {
  const resp = await fetch('https://slack.com/api/reactions.add', {
    method: 'POST',
    headers: slackHeaders(botToken),
    body: JSON.stringify({ channel, timestamp: ts, name: emoji }),
  });
  if (!resp.ok) throw new Error(`Slack reactions.add HTTP error: ${resp.status}`);
  const json = (await resp.json()) as { ok: boolean; error?: string };
  if (!json.ok && json.error !== 'already_reacted') throw new Error(`Slack reactions.add API error: ${json.error ?? 'unknown'}`);
}


