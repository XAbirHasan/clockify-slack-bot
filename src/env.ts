export interface Env {
  SLACK_SIGNING_SECRET: string;
  SLACK_BOT_TOKEN: string;
  /** base64-encoded 32-byte AES-GCM key — generate with: openssl rand -base64 32 */
  ENCRYPTION_KEY: string;
  USER_DATA: KVNamespace;
  RATE_LIMITER?: RateLimit;
}
