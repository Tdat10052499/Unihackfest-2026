// Display helpers. Amounts stay bigint base units (6 decimals) until they are shown.
import { USD_VND_RATE } from '../../constants/chain.ts';
import { sanitizeAmountInput } from '../../utils/amountInput.ts';

const DECIMALS = 6;
const UNIT = 10n ** BigInt(DECIMALS);

/** 10_000_000n → "10.00"; keeps up to 6 decimals, at least 2 */
export function usdcFromUnits(units: bigint): string {
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const whole = (abs / UNIT).toLocaleString('en-US');
  let frac = (abs % UNIT).toString().padStart(DECIMALS, '0').replace(/0+$/, '');
  if (frac.length < 2) frac = frac.padEnd(2, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
}

/** "10.00 USDC" */
export const formatUsdc = (units: bigint) => `${usdcFromUnits(units)} USDC`;

/** User input ("10", "10,5", "0.000001") → base units; null when empty or invalid. Never uses floats. */
export function unitsFromUsdc(input: string): bigint | null {
  const { normalized } = sanitizeAmountInput(input.trim(), DECIMALS);
  if (!normalized || normalized === '.') return null;
  const [whole = '0', frac = ''] = normalized.split('.');
  if (!/^\d*$/.test(whole) || !/^\d*$/.test(frac)) return null;
  return BigInt(whole || '0') * UNIT + BigInt(frac.padEnd(DECIMALS, '0') || '0');
}

/** VND amount at the fixed demo rate, rounded to the nearest 1,000 VND */
export function vndFromUnits(units: bigint): number {
  return Math.round(((Number(units) / Number(UNIT)) * USD_VND_RATE) / 1000) * 1000;
}

/** 20 USDC → "≈ 520,000 VND (estimate)" */
export const vndEstimate = (units: bigint) => `≈ ${vndFromUnits(units).toLocaleString('en-US')} VND (estimate)`;

/** Unix seconds → "2 Oct, 14:05" (device time zone) */
export function formatDeadline(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Seconds → "0:42", "4:59", "1:02:03", "2d 3h"; 0 or less → "0:00" */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const pad = (n: number) => String(n).padStart(2, '0');
  if (s >= 86_400) return `${Math.floor(s / 86_400)}d ${Math.floor((s % 86_400) / 3600)}h`;
  if (s >= 3600) return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}
