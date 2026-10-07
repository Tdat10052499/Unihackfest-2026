import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'buffer';
import { toBN } from '../../chain/idl.ts';
import idl from '../../idl/ned_program.json' with { type: 'json' };
import { coder } from '../../milestone/decode.ts';
import { jobEvents, jobLogEvents, jobSnapshot } from '../events.ts';
import { BRIEF_HASH, BUSINESS, FREELANCER, FUND_ADDRESS, job, JOB_ADDRESS, STRANGER, T0, USDC } from './fixture.ts';

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

/** "Program data: <base64>" for an event, as the program logs it (discriminator + Borsh) */
function programData(name: string, data: Record<string, unknown>) {
  const disc = (idl.events.find((e) => e.name === name) as { discriminator: number[] }).discriminator;
  return `Program data: ${Buffer.concat([Buffer.from(disc), Buffer.from(coder.types.encode(name, data))]).toString('base64')}`;
}

test('jobLogEvents decodes JobPostedOpen and JobFunded and skips other lines', () => {
  const logs = [
    'Program 8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh invoke [1]',
    'Program log: Instruction: PostJobOpen',
    programData('JobPostedOpen', {
      job: JOB_ADDRESS,
      business: BUSINESS,
      job_id: toBN(42),
      category: 3,
      total: toBN(20n * USDC),
      apply_by: toBN(T0 + 100),
      select_by: toBN(T0 + 200),
      brief_hash: Array.from(BRIEF_HASH),
    }),
    programData('JobFunded', { job: JOB_ADDRESS, total: toBN(20n * USDC) }),
    'Program data: bm90IGFuIGV2ZW50',
  ];
  const events = jobLogEvents(logs);
  assert.deepEqual(events.map((e) => e.name), ['JobPostedOpen', 'JobFunded']);
  const posted = events[0];
  assert.ok(posted.name === 'JobPostedOpen');
  assert.equal(posted.job, JOB_ADDRESS.toBase58());
  assert.equal(posted.business, BUSINESS.toBase58());
  assert.deepEqual([posted.jobId, posted.category, posted.total, posted.applyBy, posted.selectBy], [42n, 3, 20n * USDC, T0 + 100, T0 + 200]);
  assert.deepEqual(posted.briefHash, BRIEF_HASH);
  assert.deepEqual(events[1], { name: 'JobFunded', job: JOB_ADDRESS.toBase58(), total: 20n * USDC });
  assert.deepEqual(jobLogEvents(null), []);
});
