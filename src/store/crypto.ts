import type { UserConfig } from './types';
import { isUserConfig } from './types';

const toBase64 = (buf: Uint8Array): string => btoa(String.fromCharCode(...buf));
const fromBase64 = (str: string): Uint8Array => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

/**
 * Derives a unique AES-GCM key per user using HKDF.
 * The master key is used as key material and the userId is the HKDF `info`
 * parameter, so each user gets a completely distinct encryption key.
 * A payload encrypted for user A cannot be decrypted with user B's derived key.
 */
async function deriveUserKey(masterKeyBase64: string, userId: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    fromBase64(masterKeyBase64),
    'HKDF',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: new TextEncoder().encode(`clockify-user:${userId}`),
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encrypt(config: UserConfig, masterKeyBase64: string, userId: string): Promise<string> {
  const key = await deriveUserKey(masterKeyBase64, userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(config)),
  );

  return `${toBase64(iv)}.${toBase64(new Uint8Array(ciphertext))}`;
}

export async function decrypt(stored: string, masterKeyBase64: string, userId: string): Promise<UserConfig> {
  const dot = stored.indexOf('.');
  if (dot === -1) {
    throw new Error('Invalid encrypted payload');
  }

  const key = await deriveUserKey(masterKeyBase64, userId);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(stored.slice(0, dot)) },
    key,
    fromBase64(stored.slice(dot + 1)),
  );

  const parsed: unknown = JSON.parse(new TextDecoder().decode(decrypted));
  if (!isUserConfig(parsed)) {
    throw new Error('Decrypted payload has unexpected shape');
  }

  return parsed;
}
