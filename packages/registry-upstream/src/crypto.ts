import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const VERSION_TAG = 'v1';

function deriveKey(secret: string): Buffer {
  // Salt is fixed so the derived key is deterministic across processes;
  // confidentiality comes from the random IV per encryption.
  return scryptSync(secret, 'cavalry-registry-upstream', 32);
}

function getKey(): Buffer {
  const secret = process.env.CAVALRY_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('CAVALRY_ENCRYPTION_KEY is not set');
  }
  if (secret.length < 16) {
    throw new Error('CAVALRY_ENCRYPTION_KEY must be at least 16 chars');
  }
  return deriveKey(secret);
}

/** Encrypts a JSON-serializable value into an opaque envelope string. */
export function encrypt(plaintext: unknown): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const json = JSON.stringify(plaintext ?? null);
  const enc = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION_TAG, iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(
    ':',
  );
}

/** Decrypts a value previously produced by `encrypt`. Returns the original parsed JSON value. */
export function decrypt<T = unknown>(envelope: string): T {
  const parts = envelope.split(':');
  if (parts.length !== 4 || parts[0] !== VERSION_TAG) {
    throw new Error('invalid envelope format');
  }
  const iv = Buffer.from(parts[1]!, 'base64');
  const tag = Buffer.from(parts[2]!, 'base64');
  const body = Buffer.from(parts[3]!, 'base64');
  if (iv.length !== IV_BYTES) throw new Error('invalid iv length');
  if (tag.length !== TAG_BYTES) throw new Error('invalid tag length');
  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
  return JSON.parse(out) as T;
}

/** Returns true if the string looks like an encrypted envelope rather than plaintext JSON. */
export function isEnvelope(value: string): boolean {
  return /^v\d+:/.test(value) && value.split(':').length === 4;
}
