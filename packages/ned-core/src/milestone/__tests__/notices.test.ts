import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { JobEvent } from '../../jobs/events.ts';
import type { ContractEvent, ContractEventKind } from '../events.ts';
import { contractNotice, jobNotice } from '../notices.ts';

process.env.TZ = 'UTC';
const base: ContractEvent = { id: 'x', kind: 'created', fund: 'F', title: 'Landing page design', counterparty: 'C', amountUnits: 10_000_000n, viaPartner: true, index: 1, reviewBy: 1_759_400_720 };
const KINDS: ContractEventKind[] = ['created', 'accepted', 'locked', 'submitted', 'reviewSoon', 'reviewOver', 'submitMissed', 'released', 'refunded'];
const BANNED = /\bpay(ment|s|ing)?\b|escrow|\bsafe\b|guarantee|licensed|invest|#k=|paid out|VND payout/i;

test('every U3 contract event has words for both sides, ≈ VND in the Vietnam view and never USDC there', () => {
  for (const kind of KINDS)
    for (const role of ['client', 'freelancer'] as const) {
      const vn = contractNotice({ ...base, kind, role }, true, '@mia');
      const intl = contractNotice({ ...base, kind, role, viaPartner: false }, false, '@mia');
      for (const t of [vn.title, vn.message, intl.title, intl.message]) {
        assert.ok(t.length > 0);
        assert.doesNotMatch(t, BANNED);
      }
      assert.doesNotMatch(`${vn.title} ${vn.message}`, /USDC/);
    }
});

test('exact U3 titles', () => {
  const t = (kind: ContractEventKind, role: 'client' | 'freelancer', partner = false) => contractNotice({ ...base, kind, role, viaPartner: partner }, false, '@mia').title;
  assert.equal(t('created', 'freelancer'), 'New contract from @mia');
  assert.equal(t('accepted', 'client'), '@mia accepted · lock to start');
  assert.equal(t('locked', 'client'), 'Locked · @mia can start');
  assert.equal(t('locked', 'freelancer'), 'Locked · you can start');
  assert.equal(t('submitted', 'client'), 'Milestone 2 submitted · review by 2 Oct, 10:25');
  assert.equal(t('reviewSoon', 'client'), 'Review milestone 2 before 2 Oct, 10:25');
  assert.equal(t('reviewOver', 'client'), 'Review time over · milestone 2 can be released');
  assert.equal(t('reviewOver', 'freelancer'), 'Review time over · release your earnings');
  assert.equal(t('submitMissed', 'client'), 'Milestone 2 can be refunded to you');
  assert.equal(t('submitMissed', 'freelancer'), 'Submission deadline passed for milestone 2');
  assert.equal(t('released', 'client'), 'Milestone 2 released');
  // F2: after release the freelancer's next step is the hand-over
  assert.equal(t('released', 'freelancer'), 'Released · hand over the final files');
  assert.equal(t('released', 'freelancer', true), 'Released · hand over the final files');
  assert.equal(t('refunded', 'client'), 'Milestone 2 refunded to you');
  assert.equal(t('refunded', 'freelancer'), 'Milestone 2 refunded to the client');
});

test('job notices (U3, D25 row)', () => {
  const e: JobEvent = { id: 'j', kind: 'newApplicant', job: 'J', title: 'Logo', applicationCount: 1 };
  assert.deepEqual(jobNotice(e), { title: 'New applicant for “Logo”', message: '1 applicant so far.' });
  assert.equal(jobNotice({ ...e, applicationCount: 3 }).message, '3 applicants so far.');
  assert.equal(jobNotice({ ...e, kind: 'selected', acceptBy: 1_759_400_120 }).title, 'You were selected for “Logo” · accept by 2 Oct, 10:15');
  assert.equal(jobNotice({ ...e, kind: 'filled' }).title, '“Logo” was filled');
});
