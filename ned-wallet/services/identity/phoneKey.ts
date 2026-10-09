// phone_key cho PhoneRecord [b"phone_v1", phone_key] của ned_program (Phương án C, T1.5).
// SĐT dạng rõ KHÔNG bao giờ lên chain: app chuẩn hoá về E.164 rồi băm scrypt → 32 byte.
// Tham số chốt ở docs/archive/04-code-plan.md "Cập nhật sau Phase 0": N=2^15, r=8, p=1, dkLen=32 (~0.19s trên iPhone Safari).
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';

/** Salt công khai, cố định (chống bảng tra sẵn, không phải bí mật). Đổi salt = đổi toàn bộ phone_key → phải dùng seed mới. */
export const PHONE_KEY_SALT = 'ned-wallet/phone/v1';
export const PHONE_KEY_PARAMS = { N: 2 ** 15, r: 8, p: 1, dkLen: 32 } as const;

/**
 * Chuẩn hoá SĐT di động Việt Nam về E.164 (+84 + 9 chữ số).
 * Nhận: "0901234567", "090 123 4567", "+84 901 234 567", "84901234567", "(+84) 90-123-4567".
 * Trả null nếu không phải số di động VN hợp lệ (đầu số 3/5/7/8/9).
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

// Cache trong bộ nhớ: SĐT của mình + danh bạ chỉ băm 1 lần mỗi phiên
const phoneKeyCache = new Map<string, Promise<Uint8Array>>();

/** scrypt(E.164, PHONE_KEY_SALT) → 32 byte. Đầu vào phải là E.164 đã chuẩn hoá. */
export function computePhoneKey(e164: string): Promise<Uint8Array> {
  let cached = phoneKeyCache.get(e164);
  if (!cached) {
    cached = scryptAsync(utf8ToBytes(e164), utf8ToBytes(PHONE_KEY_SALT), PHONE_KEY_PARAMS);
    cached.catch(() => phoneKeyCache.delete(e164));
    phoneKeyCache.set(e164, cached);
  }
  return cached;
}

/** Chuẩn hoá + băm. Ném lỗi nếu SĐT không hợp lệ. */
export async function getPhoneKey(rawPhone: string): Promise<{ e164: string; phoneKey: Uint8Array }> {
  const e164 = normalizeVietnamPhone(rawPhone);
  if (!e164) throw new Error('Invalid Vietnamese mobile number');
  return { e164, phoneKey: await computePhoneKey(e164) };
}

/** Chỉ dùng cho test */
export function clearPhoneKeyCache(): void {
  phoneKeyCache.clear();
}
