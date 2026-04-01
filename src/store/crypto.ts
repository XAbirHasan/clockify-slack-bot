import type { UserConfig } from './types';
import { isUserConfig } from './types';

const toBase64 = (buf: Uint8Array): string => btoa(String.fromCharCode(...buf));
const fromBase64 = (str: string): Uint8Array => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

async function importKey(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromBase64(base64), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encrypt(config: UserConfig, masterKeyBase64: string, userId: string): Promise<string> {
  const key = await importKey(masterKeyBase64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(userId) },
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

  const key = await importKey(masterKeyBase64);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(stored.slice(0, dot)), additionalData: new TextEncoder().encode(userId) },
    key,
    fromBase64(stored.slice(dot + 1)),
  );

  const parsed: unknown = JSON.parse(new TextDecoder().decode(decrypted));
  if (!isUserConfig(parsed)) {
    throw new Error('Decrypted payload has unexpected shape');
  }

  return parsed;
}
