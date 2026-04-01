import type { UserConfig } from './types';
import { encrypt, decrypt } from './crypto';

export async function loadConfig(
  userId: string,
  kv: KVNamespace,
  encryptionKey: string,
): Promise<UserConfig | null> {
  const stored = await kv.get(userId);
  if (stored === null) return null;
  try {
    return await decrypt(stored, encryptionKey, userId);
  } catch {
    // Stored data is corrupt or was encrypted with a different key/version.
    throw new Error('config_invalid');
  }
}

export async function saveConfig(
  userId: string,
  config: UserConfig,
  kv: KVNamespace,
  encryptionKey: string,
): Promise<void> {
  const encrypted = await encrypt(config, encryptionKey, userId);
  await kv.put(userId, encrypted);
}

/** Like loadConfig but returns null instead of throwing on corrupt data. */
export async function tryLoadConfig(
  userId: string,
  kv: KVNamespace,
  encryptionKey: string,
): Promise<UserConfig | null> {
  try {
    return await loadConfig(userId, kv, encryptionKey);
  } catch {
    return null;
  }
}
