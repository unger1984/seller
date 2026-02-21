/**
 * Расшифровка credentials API (Ozon/WB).
 * Формат хранения: version:base64(nonce):base64(ciphertext)
 * Соответствует CredentialsCryptoService в apps/api.
 */
import { createDecipheriv, scryptSync } from 'crypto';

const VERSION = 1;
const ALGORITHM = 'aes-256-gcm';
const TAG_LEN = 16;
const KEY_LEN = 32;
const SALT = 'seller-credentials-v1';

/** Расшифровать credentials по encryption key из env */
export function credentialsDecrypt(
  encrypted: string,
  encryptionKey: string
): string {
  const [ver, ivB64, cipherB64] = encrypted.split(':');
  if (Number(ver) !== VERSION || !ivB64 || !cipherB64) {
    throw new Error('Invalid credentials format');
  }
  const key = scryptSync(encryptionKey, SALT, KEY_LEN);
  const iv = Buffer.from(ivB64, 'base64');
  const buf = Buffer.from(cipherB64, 'base64');
  const tag = buf.subarray(-TAG_LEN);
  const data = buf.subarray(0, -TAG_LEN);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data).toString('utf8') + decipher.final('utf8');
}
