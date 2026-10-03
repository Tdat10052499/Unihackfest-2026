import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evidenceHash, matchesEvidence, shortHash, toHex } from '../evidence.ts';
import { demoRecipientId, payoutReference } from '../reference.ts';

test('evidence is SHA-256 of the trimmed link, case kept', () => {
  assert.equal(toHex(evidenceHash('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.deepEqual(evidenceHash('  abc \n'), evidenceHash('abc'));
  assert.notDeepEqual(evidenceHash('ABC'), evidenceHash('abc'));
  assert.ok(matchesEvidence(' https://x.y/Design ', evidenceHash('https://x.y/Design')));
  assert.ok(!matchesEvidence('https://x.y/design', evidenceHash('https://x.y/Design')));
});

test('short hash; empty for no evidence', () => {
  assert.equal(shortHash(evidenceHash('abc')), 'ba7816…15ad');
  assert.equal(shortHash(new Uint8Array(32)), '');
});

test('payout reference = SHA-256 of the recipient ID (demo-<username>-001)', () => {
  assert.equal(demoRecipientId('vinh'), 'demo-vinh-001');
  assert.equal(payoutReference('demo-vinh-001').length, 32);
  assert.deepEqual(payoutReference('demo-vinh-001'), evidenceHash('demo-vinh-001'));
  assert.notDeepEqual(payoutReference('demo-vinh-001'), payoutReference('demo-mia-001'));
});
