import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey } from '@solana/web3.js';
import { USDC_DEVNET_MINT } from '../../constants.ts';
import { decodeFund } from '../decode.ts';
import { CLIENT, FREELANCER, FUND_ADDRESS, fundBytes, STRANGER, T0, USDC } from './fixture.ts';

test('a hand-built 708-byte SharedFund decodes field by field, only used slots', () => {
  const evidence = new Uint8Array(32).fill(7);
  const reference = new Uint8Array(32).fill(9);
  const bytes = fundBytes({
    state: 'Funded',
    payoutKind: 'PayoutPartner',
    payoutDestination: STRANGER,
    released: 3n * USDC,
    cancelProposer: FREELANCER,
    cancelFreelancerAmount: 4n * USDC,
    title: 'Thiết kế',
    payoutReference: reference,
    milestones: [
      { amount: 3n * USDC, submitBy: T0 + 600, reviewBy: T0 + 720, submittedAt: T0 + 10, evidence, status: 'Released' },
      { amount: 5n * USDC, submitBy: T0 + 700, reviewBy: T0 + 820, status: 'Disputed' },
    ],
  });
  assert.equal(bytes.length, 708);
  assert.deepEqual(bytes.subarray(12, 44), CLIENT.toBytes());
  assert.deepEqual(bytes.subarray(44, 76), FREELANCER.toBytes());

  const f = decodeFund(FUND_ADDRESS, bytes);
  assert.ok(f.address.equals(FUND_ADDRESS));
  assert.equal(f.version, 1);
  assert.equal(f.state, 'Funded');
  assert.equal(f.payoutKind, 'PayoutPartner');
  assert.ok(f.client.equals(CLIENT));
  assert.ok(f.freelancer.equals(FREELANCER));
  assert.ok(f.creator.equals(CLIENT));
  assert.ok(f.rentPayer.equals(CLIENT));
  assert.ok(f.payoutDestination.equals(STRANGER));
  assert.ok(f.mint.equals(USDC_DEVNET_MINT));
  assert.equal(f.fundId, 1_759_400_000_123n);
  assert.equal(f.createdAt, T0);
  assert.equal(f.total, 8n * USDC);
  assert.equal(f.released, 3n * USDC);
  assert.equal(f.refunded, 0n);
  assert.equal(f.milestoneCount, 2);
  assert.equal(f.milestones.length, 2, 'unused slots 2..4 are not returned');
  assert.deepEqual(
    f.milestones.map((m) => [m.index, m.amount, m.submitBy, m.reviewBy, m.submittedAt, m.status]),
    [
      [0, 3n * USDC, T0 + 600, T0 + 720, T0 + 10, 'Released'],
      [1, 5n * USDC, T0 + 700, T0 + 820, 0, 'Disputed'],
    ]
  );
  assert.deepEqual(f.milestones[0].evidence, evidence);
  assert.ok(f.cancelProposer?.equals(FREELANCER));
  assert.equal(f.cancelFreelancerAmount, 4n * USDC);
  assert.equal(f.title, 'Thiết kế');
  assert.equal(f.bump, 255);
  assert.equal(f.vaultBump, 254);
  assert.deepEqual(f.payoutReference, reference);
});

test('no cancel proposal decodes as null', () => {
  const f = decodeFund(FUND_ADDRESS, fundBytes({ milestones: [{ submitBy: T0 + 600, reviewBy: T0 + 720 }] }));
  assert.equal(f.cancelProposer, null);
});

test('wrong size or wrong discriminator is rejected', () => {
  const bytes = fundBytes({ milestones: [{ submitBy: T0 + 600, reviewBy: T0 + 720 }] });
  assert.throws(() => decodeFund(FUND_ADDRESS, bytes.subarray(0, 707)), /708 bytes/);
  const bad = Uint8Array.from(bytes);
  bad[0] ^= 0xff;
  assert.throws(() => decodeFund(PublicKey.default, bad));
});
