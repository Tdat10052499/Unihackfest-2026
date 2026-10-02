import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCountdown, formatDeadline, formatUsdc, unitsFromUsdc, usdcFromUnits, vndEstimate, vndFromUnits } from '../format.ts';

test('USDC base units ↔ display, BigInt-safe', () => {
  assert.equal(usdcFromUnits(10_000_000n), '10.00');
  assert.equal(usdcFromUnits(1n), '0.000001');
  assert.equal(usdcFromUnits(1_234_567_890n), '1,234.56789');
  assert.equal(formatUsdc(20_000_000n), '20.00 USDC');
  assert.equal(unitsFromUsdc('10'), 10_000_000n);
  assert.equal(unitsFromUsdc('10,5'), 10_500_000n);
  assert.equal(unitsFromUsdc('0.000001'), 1n);
  assert.equal(unitsFromUsdc('1.0000009'), 1_000_000n, 'digits past 6 decimals are dropped');
  assert.equal(unitsFromUsdc('9007199254740993'), 9_007_199_254_740_993_000_000n, 'no float rounding');
  assert.equal(unitsFromUsdc(''), null);
  assert.equal(unitsFromUsdc('abc'), null);
});

test('VND estimate at the fixed rate, nearest 1,000 VND', () => {
  assert.equal(vndEstimate(20_000_000n), '≈ 520,000 VND (estimate)');
  assert.equal(vndEstimate(10_000_000n), '≈ 260,000 VND (estimate)');
  assert.equal(vndFromUnits(1_000_000n), 26_000);
  assert.equal(vndFromUnits(0n), 0);
});

test('countdown and deadline', () => {
  assert.equal(formatCountdown(42), '0:42');
  assert.equal(formatCountdown(299), '4:59');
  assert.equal(formatCountdown(3723), '1:02:03');
  assert.equal(formatCountdown(2 * 86_400 + 3 * 3600), '2d 3h');
  assert.equal(formatCountdown(-5), '0:00');
  process.env.TZ = 'UTC';
  assert.equal(formatDeadline(1_759_413_900), '2 Oct, 14:05');
});
