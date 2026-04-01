function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// https://api.slack.com/authentication/verifying-requests-from-slack
export async function verifySlackSignature(
  signingSecret: string,
  timestamp: string,
  rawBody: string,
  slackSignature: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const buf = await crypto.subtle.sign('HMAC', key, encoder.encode(`v0:${timestamp}:${rawBody}`));
  const computed = 'v0=' + Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return timingSafeEqual(computed, slackSignature);
}
