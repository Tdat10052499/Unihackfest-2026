// Unit test (no library needed): node --test services/identity/__tests__/phoneKey.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bytesToHex } from '@noble/hashes/utils.js';
import { clearPhoneKeyCache, computePhoneKey, getPhoneKey, normalizeVietnamPhone } from '../phoneKey.ts';

test('normalizeVietnamPhone: common ways of writing → the same E.164', () => {
  const expected = '+84901234567';
  for (const input of [
    '0901234567',
    '090 123 4567',
    '090.123.4567',
    '+84 901 234 567',
    '+84901234567',
    '84901234567',
    '0084901234567',
    '(+84) 90-123-4567',
    '+84 0901234567',
  ]) {
    assert.equal(normalizeVietnamPhone(input), expected, input);
  }
});

test('normalizeVietnamPhone: valid mobile prefixes 3/5/7/8/9', () => {
  assert.equal(normalizeVietnamPhone('0321234567'), '+84321234567');
  assert.equal(normalizeVietnamPhone('0561234567'), '+84561234567');
  assert.equal(normalizeVietnamPhone('0771234567'), '+84771234567');
  assert.equal(normalizeVietnamPhone('0861234567'), '+84861234567');
});

test('normalizeVietnamPhone: rejects invalid numbers', () => {
  for (const input of ['', '12345', '090123456', '09012345678', '0201234567', '+1 555 555 5555', 'abc0901234567']) {
    assert.equal(normalizeVietnamPhone(input), null, input);
  }
});

test('computePhoneKey: deterministic (same input → same 32 bytes, matches the reference vector)', async () => {
  clearPhoneKeyCache();
  const a = await computePhoneKey('+84901234567');
  clearPhoneKeyCache();
  const b = await computePhoneKey('+84901234567');
  assert.equal(a.length, 32);
  assert.equal(bytesToHex(a), bytesToHex(b));
  // Reference vector: scrypt('+84901234567', 'ned-wallet/phone/v1', N=2^15, r=8, p=1, dkLen=32)
  assert.equal(bytesToHex(a), 'e0aeadd3dbc907d37bf8919ff6b00695842fa2897ff68d538a786e9949ea4a6a');
});

test('computePhoneKey: another number → another key; the cache returns the same result', async () => {
  const a = await computePhoneKey('+84901234567');
  const b = await computePhoneKey('+84912345678');
  assert.notEqual(bytesToHex(a), bytesToHex(b));
  assert.equal(bytesToHex(b), '311cacc16b3261aee1b6d8d57dab0108f297d95f74fb7fd834447edc95f3c0a4');
  assert.equal(computePhoneKey('+84901234567'), computePhoneKey('+84901234567'), 'same cached promise');
});

test('getPhoneKey: normalise then hash; every way of writing gives the same phone_key', async () => {
  const x = await getPhoneKey('0901 234 567');
  const y = await getPhoneKey('+84 901 234 567');
  assert.equal(x.e164, '+84901234567');
  assert.equal(bytesToHex(x.phoneKey), bytesToHex(y.phoneKey));
  await assert.rejects(getPhoneKey('12345'), /Invalid Vietnamese mobile number/);
});
