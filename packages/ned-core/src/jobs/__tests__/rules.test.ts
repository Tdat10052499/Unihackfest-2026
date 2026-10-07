import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canApply, canFundJob, canSelect, canWithdraw, fundedLabel, isFunded, pitchProblem, selectLocksBudget, validateJobDraft, type JobDraft } from '../rules.ts';
import { runPostJob, POST_JOB_VN_REFUSED } from '../actions.ts';
import { JOB_CATEGORIES, JOB_SKILLS, listingSkills, skillsFromMask, skillsMask } from '../taxonomy.ts';
import { JOB_CATEGORY_COUNT } from '../layout.ts';
import { BUSINESS, FREELANCER, job, T0 } from './fixture.ts';

const APPLY_BY = T0 + 3 * 86_400;
const SELECT_BY = T0 + 5 * 86_400;

test('canApply: open, before apply_by, not the business, not applied yet', () => {
  const j = job({ applyBy: APPLY_BY });
  assert.equal(canApply(j, FREELANCER, APPLY_BY), true);
  assert.equal(canApply(j, FREELANCER, APPLY_BY + 1), false);
  assert.equal(canApply(j, BUSINESS, T0), false);
  assert.equal(canApply(j, FREELANCER, T0, true), false);
  assert.equal(canApply(job({ state: 'Selected' }), FREELANCER, T0), false);
});

test('canSelect: the business, before select_by, with applicants; re-select only after the accept window', () => {
  const open = job({ applicationCount: 2, selectBy: SELECT_BY });
  assert.equal(canSelect(open, BUSINESS, SELECT_BY), true);
  assert.equal(canSelect(open, BUSINESS, SELECT_BY + 1), false);
  assert.equal(canSelect(open, FREELANCER, T0), false);
  assert.equal(canSelect(job({ applicationCount: 0 }), BUSINESS, T0), false);
  const selected = job({ state: 'Selected', applicationCount: 2, selectedAt: T0 + 100, selectBy: SELECT_BY });
  assert.equal(canSelect(selected, BUSINESS, T0 + 220), false);
  assert.equal(canSelect(selected, BUSINESS, T0 + 221), true);
  assert.equal(canSelect(job({ state: 'Filled', applicationCount: 1 }), BUSINESS, T0), false);
});

test('canWithdraw mirrors withdraw_job', () => {
  assert.equal(canWithdraw(job({ applicationCount: 0 }), BUSINESS, T0), true);
  assert.equal(canWithdraw(job({ applicationCount: 0 }), FREELANCER, T0), false);
  assert.equal(canWithdraw(job({ applicationCount: 1, selectBy: SELECT_BY }), BUSINESS, SELECT_BY), false);
  assert.equal(canWithdraw(job({ applicationCount: 1, selectBy: SELECT_BY }), BUSINESS, SELECT_BY + 1), true);
  const selected = job({ state: 'Selected', applicationCount: 1, selectBy: SELECT_BY, selectedAt: SELECT_BY - 10 });
  assert.equal(canWithdraw(selected, BUSINESS, SELECT_BY + 1), false);
  assert.equal(canWithdraw(selected, BUSINESS, SELECT_BY + 111), true);
  assert.equal(canWithdraw(job({ state: 'Filled' }), BUSINESS, SELECT_BY + 9_999), false);
  assert.equal(canWithdraw(job({ state: 'Withdrawn' }), BUSINESS, SELECT_BY + 9_999), false);
});

test('pitch: 1–280 bytes of UTF-8 (bytes, not characters)', () => {
  assert.match(pitchProblem('  ') ?? '', /Write/);
  assert.equal(pitchProblem('p'.repeat(280)), null);
  assert.match(pitchProblem('p'.repeat(281)) ?? '', /280/);
  assert.match(pitchProblem('đ'.repeat(141)) ?? '', /280/); // 2 bytes each
});

const draft = (over: Partial<JobDraft> = {}): JobDraft => ({
  title: 'Logo for a café',
  summary: 'A simple logo and two colour variants.',
  category: 0,
  skills: [0, 3],
  milestones: [{ amountUsdc: '10', workSecs: 3 * 86_400, reviewSecs: 86_400 }],
  brief: { scope: 'A logo.', references: [], milestones: [{ name: 'Logo', criteria: ['SVG'] }] },
  applyBy: APPLY_BY,
  selectBy: SELECT_BY,
  ...over,
});

test('validateJobDraft mirrors post_job', () => {
  assert.deepEqual(validateJobDraft(draft(), T0), []);
  const fields = (d: JobDraft) => validateJobDraft(d, T0).map((p) => p.field);
  assert.ok(fields(draft({ title: '' })).includes('title'));
  assert.ok(fields(draft({ title: 'é'.repeat(17) })).includes('title'));
  assert.ok(fields(draft({ summary: '' })).includes('summary'));
  assert.ok(fields(draft({ summary: 's'.repeat(161) })).includes('summary'));
  assert.deepEqual(fields(draft({ summary: 's'.repeat(160) })), []);
  assert.ok(fields(draft({ category: 8 })).includes('category'));
  assert.ok(fields(draft({ skills: [64] })).includes('skills'));
  assert.ok(fields(draft({ milestones: [] })).includes('milestones'));
  assert.ok(fields(draft({ milestones: [{ amountUsdc: '0', workSecs: 600, reviewSecs: 60 }] })).includes('milestones.0.amount'));
  assert.ok(fields(draft({ milestones: [{ amountUsdc: '1', workSecs: 59, reviewSecs: 60 }] })).includes('milestones.0.work'));
  assert.ok(fields(draft({ milestones: [{ amountUsdc: '1', workSecs: 60, reviewSecs: 59 }] })).includes('milestones.0.review'));
  assert.ok(fields(draft({ milestones: [{ amountUsdc: '1000.000001', workSecs: 60, reviewSecs: 60 }] })).includes('milestones'));
  assert.ok(fields(draft({ applyBy: T0 })).includes('applyBy'));
  assert.ok(fields(draft({ selectBy: APPLY_BY - 1 })).includes('selectBy'));
  assert.ok(fields(draft({ brief: { scope: 'x', references: [], milestones: [] } })).includes('milestones'));
});

test('runPostJob refuses in the Vietnam view before anything is signed', async () => {
  let signed = false;
  const env = { signer: { walletAddress: BUSINESS.toBase58(), signTransaction: async (t: never) => ((signed = true), t) }, now: async () => T0 };
  await assert.rejects(runPostJob(env as never, draft(), 'vn'), (e: Error) => e.message === POST_JOB_VN_REFUSED);
  assert.equal(signed, false);
});

test('taxonomy: 8 categories 0–7, unique skill indices and ids, valid categories, mask round trip', () => {
  assert.equal(JOB_CATEGORIES.length, JOB_CATEGORY_COUNT);
  assert.deepEqual(JOB_CATEGORIES.map((c) => c.index), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(JOB_SKILLS.map((k) => k.index), JOB_SKILLS.map((_, i) => i), 'skills are append-only and dense');
  assert.equal(new Set(JOB_SKILLS.map((k) => k.id)).size, JOB_SKILLS.length);
  assert.ok(JOB_SKILLS.every((k) => k.category >= 0 && k.category < JOB_CATEGORY_COUNT));
  assert.ok(JOB_SKILLS.length >= 40 && JOB_SKILLS.length <= 64);
  assert.equal(skillsMask([0, 3, 63]), 1n | 8n | (1n << 63n));
  assert.deepEqual(skillsFromMask(skillsMask([0, 3, 63])), [0, 3, 63]);
  assert.throws(() => skillsMask([64]));
  assert.deepEqual(listingSkills(skillsMask([1, 62])).map((k) => k.index), [1], 'unknown bits are skipped');
});

test('v1.4 funded helpers and canFundJob: the business, Open, unfunded, before select_by', () => {
  const funded = job({ selectBy: SELECT_BY });
  const open = job({ selectBy: SELECT_BY, unfunded: true });
  assert.deepEqual([isFunded(funded), isFunded(open)], [true, false]);
  assert.deepEqual([fundedLabel(funded), fundedLabel(open)], ['Budget locked', 'Locks when hired']);
  assert.deepEqual([selectLocksBudget(funded), selectLocksBudget(open)], [false, true]);
  assert.equal(canFundJob(open, BUSINESS, SELECT_BY), true);
  assert.equal(canFundJob(open, BUSINESS, SELECT_BY + 1), false, 'after select_by');
  assert.equal(canFundJob(open, FREELANCER, T0), false, 'only the business');
  assert.equal(canFundJob(funded, BUSINESS, T0), false, 'already funded');
  assert.equal(canFundJob(job({ state: 'Withdrawn', unfunded: true }), BUSINESS, T0), false, 'not Open');
});

test('v1.4 canSelect on an unfunded listing needs fund_job to be possible in the same transaction', () => {
  const open = job({ applicationCount: 1, selectBy: SELECT_BY, unfunded: true });
  assert.equal(canSelect(open, BUSINESS, SELECT_BY), true);
  assert.equal(canSelect(open, BUSINESS, SELECT_BY + 1), false);
  assert.equal(canSelect(open, FREELANCER, T0), false);
});

test('CORE_FEATURES.lockAtHire defaults to true (apps may override)', async () => {
  const { CORE_FEATURES } = await import('../../features.ts');
  assert.equal(CORE_FEATURES.lockAtHire, true);
});
