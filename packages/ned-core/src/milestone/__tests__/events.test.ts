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

test('U3 table: lock → both, submit → client, release → both; each once', () => {
  const accepted = fund({ state: 'Accepted', payoutKind: 'PayoutPartner', milestones: [M(), M()] });
  const funded = fund({ state: 'Funded', payoutKind: 'PayoutPartner', milestones: [M(), M()] });
  const submitted = fund({ state: 'Funded', payoutKind: 'PayoutPartner', milestones: [M('Submitted'), M()] });
  const released = fund({ state: 'Funded', payoutKind: 'PayoutPartner', milestones: [M('Released', { amount: 3n * USDC }), M()] });

  const locked = contractEvents(contractSnapshot([accepted]), [funded], F);
  assert.deepEqual(ids(locked), ['contract:F:locked']);
  assert.equal(locked[0].amountUnits, 20n * USDC);
  assert.equal(locked[0].viaPartner, true);
  assert.equal(locked[0].counterparty, C);
  // U3: the client hears it too (with Funded Jobs the freelancer's accept moves the budget in)
  const clientLocked = contractEvents(contractSnapshot([accepted]), [funded], C);
  assert.deepEqual(ids(clientLocked), ['contract:F:locked']);
  assert.equal(clientLocked[0].role, 'client');
  assert.equal(locked[0].role, 'freelancer');

  const sub = contractEvents(contractSnapshot([funded]), [submitted], C);
  assert.deepEqual(ids(sub), ['contract:F:submitted:0']);
  assert.equal(sub[0].reviewBy, submitted.milestones[0].reviewBy);
  assert.deepEqual(contractEvents(contractSnapshot([funded]), [submitted], F), []);

  const rel = contractEvents(contractSnapshot([submitted]), [released], F);
  assert.deepEqual(ids(rel), ['contract:F:released:0']);
  assert.equal(rel[0].amountUnits, 3n * USDC);
  assert.deepEqual(contractEvents(contractSnapshot([released]), [released], F), [], 'no repeat');
  assert.deepEqual(ids(contractEvents(contractSnapshot([submitted]), [released], C)), ['contract:F:released:0']);
});

test('accepted → client; refunded → both', () => {
  const created = fund({ state: 'Created', payoutKind: 'Unset', milestones: [M()] });
  const accepted = fund({ state: 'Accepted', milestones: [M()] });
  assert.deepEqual(ids(contractEvents(contractSnapshot([created]), [accepted], C)), ['contract:F:accepted']);
  assert.deepEqual(contractEvents(contractSnapshot([created]), [accepted], F), []);
  const pending = fund({ milestones: [M(), M()] });
  const refunded = fund({ milestones: [M('Refunded'), M()] });
  assert.deepEqual(ids(contractEvents(contractSnapshot([pending]), [refunded], C)), ['contract:F:refunded:0']);
  assert.deepEqual(ids(contractEvents(contractSnapshot([pending]), [refunded], F)), ['contract:F:refunded:0']);
});

test('deadline events fire once, on the read whose window crosses the deadline', () => {
  const submitted = fund({ milestones: [M('Submitted'), M()] });
  const reviewBy = submitted.milestones[0].reviewBy;
  const submitBy = submitted.milestones[1].submitBy;
  const snap = contractSnapshot([submitted]);
  // review events only (milestone 2's submission deadline is checked on its own below)
  const at = (prevNow: number, now: number, wallet: string) =>
    ids(contractEvents(snap, [submitted], wallet, { prevNow, now })).filter((x) => x.includes('review'));
  assert.deepEqual(at(reviewBy - 120, reviewBy - 90, C), [], 'too early');
  assert.deepEqual(at(reviewBy - 90, reviewBy - 30, C), ['contract:F:reviewSoon:0']);
  assert.deepEqual(at(reviewBy - 90, reviewBy - 30, F), [], 'review soon is for the client');
  assert.deepEqual(at(reviewBy - 30, reviewBy - 10, C), [], 'not again');
  assert.deepEqual(at(reviewBy - 10, reviewBy + 5, F), ['contract:F:reviewOver:0']);
  assert.deepEqual(at(reviewBy - 10, reviewBy + 5, C), ['contract:F:reviewOver:0']);
  assert.deepEqual(ids(contractEvents(snap, [submitted], F, { prevNow: submitBy - 5, now: submitBy + 5 })), ['contract:F:submitMissed:1']);
  assert.deepEqual(ids(contractEvents(snap, [submitted], C, { prevNow: submitBy + 5, now: submitBy + 30 })), [], 'once');
  assert.deepEqual(contractEvents(snap, [submitted], C), [], 'no times: no deadline events');
});

test('a contract seen for the first time already settled reports created and the release', () => {
  const settled = fund({ state: 'Settled', milestones: [M('Released')] });
  assert.deepEqual(ids(contractEvents({}, [settled], F)), ['contract:F:created', 'contract:F:released:0']);
});
