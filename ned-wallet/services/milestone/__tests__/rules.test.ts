// Every deadline at t−1, t, t+1 (program-spec 3.4: "passed" means now > deadline), plus signer and index checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as r from '../rules.ts';
import { CLIENT, FREELANCER, fund, M, STRANGER, T0, USDC } from './fixture.ts';

const c = CLIENT.toBase58();
const f = FREELANCER.toBase58();
const s = STRANGER.toBase58();
const SUBMIT = T0 + 600;
const REVIEW = T0 + 720;
const WINDOW_EDGE = SUBMIT - 60; // last second with a full work window

test('accept / lock: work window, inclusive at submit_by − 60', () => {
  const created = fund({ state: 'Created', payoutKind: 'Unset', milestones: [M()] });
  const accepted = fund({ state: 'Accepted', milestones: [M()] });
  assert.deepEqual([WINDOW_EDGE - 1, WINDOW_EDGE, WINDOW_EDGE + 1].map((t) => r.canAccept(created, f, t)), [true, true, false]);
  assert.deepEqual([WINDOW_EDGE - 1, WINDOW_EDGE, WINDOW_EDGE + 1].map((t) => r.canLock(accepted, c, t)), [true, true, false]);
  assert.ok(!r.canAccept(created, c, T0), 'only the freelancer accepts');
  assert.ok(!r.canLock(accepted, f, T0), 'only the client locks');
  assert.ok(!r.canLock(created, c, T0), 'lock needs Accepted');
  assert.ok(!r.canAccept(accepted, f, T0), 'accept twice');
  assert.deepEqual([WINDOW_EDGE, WINDOW_EDGE + 1].map((t) => r.isTooLate(created, t)), [false, true]);
  assert.ok(!r.isTooLate(fund({ milestones: [M()] }), WINDOW_EDGE + 1), 'a funded contract is never too late');
});

test('the work window uses the earliest submit_by of the used milestones only', () => {
  const two = fund({ state: 'Created', milestones: [M('Pending', { submitBy: SUBMIT + 500, reviewBy: SUBMIT + 620 }), M()] });
  assert.ok(r.canAccept(two, f, WINDOW_EDGE));
  assert.ok(!r.canAccept(two, f, WINDOW_EDGE + 1));
});

test('submit: allowed while now <= submit_by', () => {
  const funded = fund({ milestones: [M()] });
  assert.deepEqual([SUBMIT - 1, SUBMIT, SUBMIT + 1].map((t) => r.canSubmit(funded, f, 0, t)), [true, true, false]);
  assert.ok(!r.canSubmit(funded, c, 0, T0), 'only the freelancer submits');
  assert.ok(!r.canSubmit(fund({ milestones: [M('Submitted')] }), f, 0, T0), 'only Pending');
});

test('refund: allowed once now > submit_by, by anyone, Pending only', () => {
  const funded = fund({ milestones: [M()] });
  assert.deepEqual([SUBMIT - 1, SUBMIT, SUBMIT + 1].map((t) => r.canRefund(funded, 0, t)), [false, false, true]);
  assert.ok(!r.canRefund(fund({ milestones: [M('Submitted')] }), 0, SUBMIT + 1));
  assert.ok(!r.canRefund(fund({ state: 'Accepted', milestones: [M()] }), 0, SUBMIT + 1), 'needs Funded');
});

test('release_after_review: allowed once now > review_by, Submitted only (a dispute blocks it)', () => {
  const submitted = fund({ milestones: [M('Submitted')] });
  assert.deepEqual([REVIEW - 1, REVIEW, REVIEW + 1].map((t) => r.canReleaseAfterReview(submitted, 0, t)), [false, false, true]);
  assert.ok(!r.canReleaseAfterReview(fund({ milestones: [M('Disputed')] }), 0, REVIEW + 1));
});

test('dispute: client only, Submitted, allowed while now <= review_by', () => {
  const submitted = fund({ milestones: [M('Submitted')] });
  assert.deepEqual([REVIEW - 1, REVIEW, REVIEW + 1].map((t) => r.canDispute(submitted, c, 0, t)), [true, true, false]);
  assert.ok(!r.canDispute(submitted, f, 0, T0));
  assert.ok(!r.canDispute(fund({ milestones: [M()] }), c, 0, T0));
});

test('approve: client only, Submitted or Disputed; concede: freelancer only, Disputed', () => {
  for (const [status, ok] of [['Pending', false], ['Submitted', true], ['Disputed', true], ['Released', false]] as const) {
    assert.equal(r.canApprove(fund({ milestones: [M(status)] }), c, 0), ok, status);
  }
  assert.ok(!r.canApprove(fund({ milestones: [M('Submitted')] }), f, 0));
  assert.ok(r.canConcede(fund({ milestones: [M('Disputed')] }), f, 0));
  assert.ok(!r.canConcede(fund({ milestones: [M('Disputed')] }), c, 0));
  assert.ok(!r.canConcede(fund({ milestones: [M('Submitted')] }), f, 0));
});

test('index must be < milestone_count', () => {
  const two = fund({ milestones: [M('Submitted'), M('Submitted')] });
  for (const i of [2, 3, 4, -1, 1.5]) {
    assert.ok(!r.canSubmit(two, f, i, T0));
    assert.ok(!r.canApprove(two, c, i));
    assert.ok(!r.canReleaseAfterReview(two, i, REVIEW + 1));
    assert.ok(!r.canRefund(two, i, SUBMIT + 1));
    assert.ok(!r.canDispute(two, c, i, T0));
    assert.ok(!r.canConcede(two, f, i));
  }
});

test('close: creator only; Created, Accepted or Settled', () => {
  for (const [state, ok] of [['Created', true], ['Accepted', true], ['Funded', false], ['Settled', true]] as const) {
    assert.equal(r.canClose(fund({ state, milestones: [M()] }), c, ), ok, state);
  }
  assert.ok(!r.canClose(fund({ state: 'Settled', milestones: [M('Released')] }), f));
});

test('split: proposal capped by unsettled; only the other party accepts', () => {
  const two = fund({ milestones: [M('Released'), M('Submitted')] });
  assert.equal(r.unsettled(two), 10n * USDC);
  assert.ok(r.canProposeSplit(two, c, 10n * USDC));
  assert.ok(!r.canProposeSplit(two, f, 10n * USDC + 1n));
  assert.ok(!r.canProposeSplit(two, s));
  const proposed = fund({ milestones: [M(), M()], cancelProposer: CLIENT, cancelFreelancerAmount: 5n * USDC });
  assert.ok(r.canAcceptSplit(proposed, f));
  assert.ok(!r.canAcceptSplit(proposed, c), 'not the proposer');
  assert.ok(!r.canAcceptSplit(proposed, s), 'not a stranger');
  assert.ok(!r.canAcceptSplit(fund({ milestones: [M()] }), f), 'no proposal');
});

test('validateDraft mirrors create_fund', () => {
  const ok = { freelancer: f, title: 'Landing page design', milestones: [{ amountUsdc: '10', submitBy: SUBMIT, reviewSeconds: 120 }] };
  assert.deepEqual(r.validateDraft(ok, T0, c), { ok: true, errors: [] });
  const fields = (d: r.ContractDraft, now = T0) => r.validateDraft(d, now, c).errors.map((e) => e.field);
  assert.deepEqual(fields({ ...ok, milestones: [] }), ['milestones']);
  assert.deepEqual(fields({ ...ok, milestones: Array(6).fill(ok.milestones[0]) }), ['milestones']);
  assert.deepEqual(fields({ ...ok, milestones: [{ ...ok.milestones[0], amountUsdc: '0' }] }), ['milestones.0.amountUsdc']);
  assert.deepEqual(fields({ ...ok, milestones: [{ ...ok.milestones[0], amountUsdc: '1000.000001' }] }), ['total']);
  assert.deepEqual(fields({ ...ok, milestones: [{ ...ok.milestones[0], amountUsdc: '1000' }] }), []);
  assert.deepEqual(fields({ ...ok, milestones: [{ ...ok.milestones[0], reviewSeconds: 59 }] }), ['milestones.0.reviewSeconds']);
  assert.deepEqual(fields(ok, WINDOW_EDGE), []);
  assert.deepEqual(fields(ok, WINDOW_EDGE + 1), ['milestones.0.submitBy']);
  assert.deepEqual(fields({ ...ok, freelancer: c }), ['freelancer']);
  assert.deepEqual(fields({ ...ok, freelancer: 'not an address' }), ['freelancer']);
  assert.deepEqual(fields({ ...ok, title: 'x'.repeat(33) }), ['title']);
  assert.deepEqual(fields({ ...ok, title: 'ế'.repeat(11) }), ['title'], '33 bytes of UTF-8');
});
