import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jobEvents, jobSnapshot } from '../events.ts';
import { BUSINESS, FREELANCER, FUND_ADDRESS, job, STRANGER, T0 } from './fixture.ts';

const F = FREELANCER.toBase58();

test('new applicant → business; selected → the selected applicant; filled → the others; nothing on the first read', () => {
  const open = job({ applicationCount: 1 });
  assert.deepEqual(jobEvents(null, [open], [], BUSINESS.toBase58()), []);
  const more = job({ applicationCount: 2 });
  const applicant = jobEvents(jobSnapshot([open]), [more], [], BUSINESS.toBase58());
  assert.deepEqual(applicant.map((e) => e.kind), ['newApplicant']);
  assert.equal(applicant[0].applicationCount, 2);
  assert.deepEqual(jobEvents(jobSnapshot([more]), [more], [], BUSINESS.toBase58()), [], 'no repeat');

  const selected = job({ state: 'Selected', applicationCount: 2, selected: FREELANCER, selectedAt: T0 + 400, fund: FUND_ADDRESS });
  const sel = jobEvents(jobSnapshot([more]), [], [selected], F);
  assert.deepEqual(sel.map((e) => e.kind), ['selected']);
  assert.equal(sel[0].acceptBy, T0 + 520);
  assert.equal(sel[0].fund, FUND_ADDRESS.toBase58());
  assert.deepEqual(jobEvents(jobSnapshot([more]), [], [selected], STRANGER.toBase58()), [], 'another applicant hears nothing yet');

  const filled = job({ state: 'Filled', applicationCount: 2, selected: FREELANCER, selectedAt: T0 + 400, fund: FUND_ADDRESS });
  assert.deepEqual(jobEvents(jobSnapshot([selected]), [], [filled], STRANGER.toBase58()).map((e) => e.kind), ['filled']);
  assert.deepEqual(jobEvents(jobSnapshot([selected]), [], [filled], F), [], 'the hired one hears it from the contract');
});
