/**
 * Identity & Phone Utilities (100% Solana Native Architecture)
 * 
 * Identity helpers and phone number normalisation,
 * plus safe placeholder functions while connecting to the Anchor program PDAs.
 */

/**
 * Normalises a phone number to the standard format (E.164 +84...)
 */
export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('0') && cleaned.length >= 9) {
    cleaned = '+84' + cleaned.slice(1);
  } else if (!cleaned.startsWith('+') && cleaned.startsWith('84') && cleaned.length >= 10) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+') && cleaned.length >= 9) {
    cleaned = '+84' + cleaned;
  }
  return cleaned;
}

/**
 * Whether two phone number strings are the same number (ignores +84 / 0 / spaces)
 */
export function isSamePhoneNumber(phone1?: string | null, phone2?: string | null): boolean {
  if (!phone1 || !phone2) return false;
  const p1 = phone1.trim();
  const p2 = phone2.trim();
  if (!p1 || !p2) return false;
  if (p1 === p2) return true;

  const v1 = getPhoneVariants(p1);
  const v2 = getPhoneVariants(p2);
  return v1.some((variant) => v2.includes(variant));
}

/**
 * Builds the variants of a phone number so lookups miss nothing (+84..., 0..., 84...)
 */
export function getPhoneVariants(phone: string): string[] {
  const cleaned = phone.trim().replace(/[^\d+]/g, '');
  const digits = phone.trim().replace(/[^\d]/g, '');
  const normalized = normalizePhoneNumber(phone);

  let local0 = '';
  if (normalized.startsWith('+84')) {
    local0 = '0' + normalized.slice(3);
  } else if (digits.startsWith('84')) {
    local0 = '0' + digits.slice(2);
  }

  const variants = new Set([cleaned, digits, normalized]);
  if (local0) variants.add(local0);
  return Array.from(variants).filter(Boolean);
}

/**
 * Formats a phone number with the middle digits hidden (e.g. 0912 ••• 678)
 */
export function getMaskedPhone(phone?: string | null): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length < 8) return cleaned;
  const start = cleaned.slice(0, 4);
  const end = cleaned.slice(-3);
  return `${start} ••• ${end}`;
}

/**
 * Gets the dynamic N.E.D account identifier
 */
export function getAccountIdentifier(user?: any, phone?: string | null): string {
  if (phone) {
    const digits = phone.replace(/[^\d]/g, '');
    const last4 = digits.slice(-4) || '8888';
    return `NED-${last4}`;
  }
  if (user?.id) {
    const cleanId = user.id.replace(/[^\w]/g, '');
    const last4 = cleanId.slice(-4).toUpperCase() || 'USER';
    return `NED-${last4}`;
  }
  return 'NED-ACC';
}


/** Vietnamese E.164 number shown with the middle hidden, as in the design: +84901234567 → "+84 90 •••• 4567" */
export function maskPhoneDisplay(e164?: string | null): string {
  if (!e164) return '';
  const digits = e164.replace(/[^\d]/g, '');
  const local = digits.startsWith('84') ? digits.slice(2) : digits.replace(/^0/, '');
  if (local.length < 7) return e164;
  return `+84 ${local.slice(0, 2)} •••• ${local.slice(-4)}`;
}
