import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contractEvents, contractSnapshot } from '../events.ts';
import { CLIENT, FREELANCER, fund, FUND_ADDRESS, M, STRANGER, USDC } from './fixture.ts';

const F = FREELANCER.toBase58();
const C = CLIENT.toBase58();
const ids = (e: { id: string }[]) => e.map((x) => x.id.replace(FUND_ADDRESS.toBase58(), 'F'));

test('first read reports nothing; a new contract is reported to the freelancer only', () => {
  const created = fund({ state: 'Created', payoutKind: 'Unset', milestones: [M()] });
  assert.deepEqual(contractEvents(null, [created], F), []);
  assert.deepEqual(ids(contractEvents({}, [created], F)), ['contract:F:created']);
  assert.deepEqual(contractEvents({}, [created], C), []);
  assert.deepEqual(contractEvents({}, [created], STRANGER.toBase58()), []);
});

test('lock → freelancer, submit → client, release → freelancer; each once', () => {
  const accepted = fund({ state: 'Accepted', payoutKind: 'PayoutPartner', milestones: [M(), M()] });
  const funded = fund({ state: 'Funded', payoutKind: 'PayoutPartner', milestones: [M(), M()] });
  const submitted = fund({ state: 'Funded', payoutKind: 'PayoutPartner', milestones: [M('Submitted'), M()] });
  const released = fund({ state: 'Funded', payoutKind: 'PayoutPartner', milestones: [M('Released', { amount: 3n * USDC }), M()] });

  const locked = contractEvents(contractSnapshot([accepted]), [funded], F);
  assert.deepEqual(ids(locked), ['contract:F:locked']);
  assert.equal(locked[0].amountUnits, 20n * USDC);
  assert.equal(locked[0].viaPartner, true);
  assert.equal(locked[0].counterparty, C);
  assert.deepEqual(contractEvents(contractSnapshot([accepted]), [funded], C), [], 'the client locked it: no notice');

  const sub = contractEvents(contractSnapshot([funded]), [submitted], C);
  assert.deepEqual(ids(sub), ['contract:F:submitted:0']);
  assert.equal(sub[0].reviewBy, submitted.milestones[0].reviewBy);
  assert.deepEqual(contractEvents(contractSnapshot([funded]), [submitted], F), []);

  const rel = contractEvents(contractSnapshot([submitted]), [released], F);
  assert.deepEqual(ids(rel), ['contract:F:released:0']);
  assert.equal(rel[0].amountUnits, 3n * USDC);
  assert.deepEqual(contractEvents(contractSnapshot([released]), [released], F), [], 'no repeat');
});

test('a contract seen for the first time already settled reports created and the release', () => {
  const settled = fund({ state: 'Settled', milestones: [M('Released')] });
  assert.deepEqual(ids(contractEvents({}, [settled], F)), ['contract:F:created', 'contract:F:released:0']);
});
