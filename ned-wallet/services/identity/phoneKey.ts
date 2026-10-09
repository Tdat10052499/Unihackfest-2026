// phone_key for ned_program's PhoneRecord [b"phone_v1", phone_key] (option C, T1.5).
// The phone number in clear NEVER goes on chain: the app normalises it to E.164, then hashes it with scrypt → 32 bytes.
// Parameters fixed in docs/archive/04-code-plan.md "Update after Phase 0": N=2^15, r=8, p=1, dkLen=32 (~0.19s on iPhone Safari).
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';

/** Public, fixed salt (against precomputed tables, not a secret). Changing the salt changes every phone_key → needs a new seed. */
export const PHONE_KEY_SALT = 'ned-wallet/phone/v1';
export const PHONE_KEY_PARAMS = { N: 2 ** 15, r: 8, p: 1, dkLen: 32 } as const;

/**
 * Normalises a Vietnamese mobile number to E.164 (+84 + 9 digits).
 * Accepts: "0901234567", "090 123 4567", "+84 901 234 567", "84901234567", "(+84) 90-123-4567".
 * Returns null if it is not a valid Vietnamese mobile number (prefix 3/5/7/8/9).
 */
export function normalizeVietnamPhone(raw: string): string | null {
  const compact = raw.trim().replace(/[\s.\-()]/g, '');
  let national: string;
  if (compact.startsWith('+84')) national = compact.slice(3);
  else if (compact.startsWith('0084')) national = compact.slice(4);
  else if (compact.startsWith('84') && compact.length === 11) national = compact.slice(2);
  else if (compact.startsWith('0')) national = compact.slice(1);
  else national = compact;

  if (national.startsWith('0')) national = national.slice(1); // "+84 0901…"
  return /^[35789]\d{8}$/.test(national) ? `+84${national}` : null;
}

// In-memory cache: our own number and contacts are hashed once per session
const phoneKeyCache = new Map<string, Promise<Uint8Array>>();

/** scrypt(E.164, PHONE_KEY_SALT) → 32 bytes. The input must be a normalised E.164. */
export function computePhoneKey(e164: string): Promise<Uint8Array> {
  let cached = phoneKeyCache.get(e164);
  if (!cached) {
    cached = scryptAsync(utf8ToBytes(e164), utf8ToBytes(PHONE_KEY_SALT), PHONE_KEY_PARAMS);
    cached.catch(() => phoneKeyCache.delete(e164));
    phoneKeyCache.set(e164, cached);
  }
  return cached;
}

/** Normalise + hash. Throws if the number is invalid. */
export async function getPhoneKey(rawPhone: string): Promise<{ e164: string; phoneKey: Uint8Array }> {
  const e164 = normalizeVietnamPhone(rawPhone);
  if (!e164) throw new Error('Invalid Vietnamese mobile number');
  return { e164, phoneKey: await computePhoneKey(e164) };
}

/** For tests only */
export function clearPhoneKeyCache(): void {
  phoneKeyCache.clear();
}
