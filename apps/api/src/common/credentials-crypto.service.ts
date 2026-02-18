/**
 * Шифрование credentials API (Ozon/WB) — AES-256-GCM.
 * Формат: version:base64(nonce):base64(ciphertext)
 * Master key — env CREDENTIALS_ENCRYPTION_KEY (32 байта hex).
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

const VERSION = 1;
const ALGORITHM = 'aes-256-gcm';
const IV_LEN = 16;
const TAG_LEN = 16;
const KEY_LEN = 32;
const SALT = 'seller-credentials-v1';

@Injectable()
export class CredentialsCryptoService {
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const secret = this.config.get<string>(
      'CREDENTIALS_ENCRYPTION_KEY',
      'dev-only-change-in-production-32bytes!!'
    );
    this.key = scryptSync(secret, SALT, KEY_LEN);
  }

  /** Зашифровать — format: "1:base64(nonce):base64(ciphertext)" */
  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const enc = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
      cipher.getAuthTag(),
    ]);
    return `${VERSION}:${iv.toString('base64')}:${enc.toString('base64')}`;
  }

  /** Расшифровать */
  decrypt(encrypted: string): string {
    const [ver, ivB64, cipherB64] = encrypted.split(':');
    if (Number(ver) !== VERSION || !ivB64 || !cipherB64) {
      throw new Error('Invalid credentials format');
    }
    const iv = Buffer.from(ivB64, 'base64');
    const buf = Buffer.from(cipherB64, 'base64');
    const tag = buf.subarray(-TAG_LEN);
    const data = buf.subarray(0, -TAG_LEN);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data) + decipher.final('utf8');
  }
}
