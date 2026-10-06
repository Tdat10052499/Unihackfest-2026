import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey, Transaction } from '@solana/web3.js';
import { hashBytes, type BriefDraft } from '../../milestone/content.ts';
import { buildJobBriefTxs, completeBriefSets, fetchJobBrief, jobBriefBytes, jobBriefParts, readJobBrief, type JobBriefRecord } from '../brief.ts';
import { buildApplyJobIx } from '../actions.ts';
import { BUSINESS, FREELANCER, JOB_ADDRESS } from './fixture.ts';

const DRAFT: BriefDraft = {
  scope: 'A logo for a café in Đà Nẵng. '.repeat(40),
  references: ['https://example.com/moodboard'],
  milestones: [{ name: 'Logo', criteria: ['Two colour variants', 'SVG and PNG'] }],
};
const BYTES = jobBriefBytes('Logo for a café', DRAFT);
const HASH = hashBytes(BYTES);

/** Mocked RPC: each entry becomes one confirmed transaction, newest first as getSignaturesForAddress returns them */
function rpc(entries: { tx: Transaction; err?: boolean; sigErr?: boolean; slot: number }[]) {
  const sigs = entries.map((_, i) => `sig${i}`);
  return {
    getSignaturesForAddress: async () => entries.map((e, i) => ({ signature: sigs[i], err: e.sigErr ? {} : null })).reverse(),
    getTransactions: async (list: string[]) =>
      list.map((s) => {
        const e = entries[sigs.indexOf(s)];
        e.tx.feePayer = BUSINESS;
        e.tx.recentBlockhash = PublicKey.default.toBase58();
        return { slot: e.slot, meta: { err: e.err ? {} : null, loadedAddresses: undefined }, transaction: { message: e.tx.compileMessage() } };
      }),
  } as never;
}

test('the brief is split into post_job_brief parts of at most 900 bytes', () => {
  const parts = jobBriefParts(BYTES);
  assert.ok(BYTES.length > 900);
  assert.equal(parts.length, Math.ceil(BYTES.length / 900));
  assert.ok(parts.every((p) => p.length <= 900));
  assert.throws(() => jobBriefParts(new Uint8Array(900 * 8 + 1)), /too long/);
});

test('round trip: parts posted on-chain read back as status ok with the parsed brief', async () => {
  const txs = buildJobBriefTxs({ job: JOB_ADDRESS, business: BUSINESS, bytes: BYTES });
  const result = await fetchJobBrief({ address: JOB_ADDRESS, business: BUSINESS, briefHash: HASH }, rpc(txs.map((tx, i) => ({ tx, slot: 10 + i }))));
  assert.equal(result.status, 'ok');
  assert.equal(result.brief?.title, 'Logo for a café');
  assert.deepEqual(result.brief?.milestones[0].criteria, ['Two colour variants', 'SVG and PNG']);
  assert.deepEqual(result.shownBriefHash, HASH);
});

test('failed transactions, other instructions and parts signed by someone else are skipped', async () => {
  const good = buildJobBriefTxs({ job: JOB_ADDRESS, business: BUSINESS, bytes: BYTES });
  const forged = buildJobBriefTxs({ job: JOB_ADDRESS, business: FREELANCER, bytes: jobBriefBytes('Logo for a café', { ...DRAFT, scope: 'Other work' }) });
  const other = new Transaction().add(buildApplyJobIx(JOB_ADDRESS, FREELANCER, 'hi'));
  const entries = [
    ...good.map((tx, i) => ({ tx, slot: 10 + i })),
    { tx: forged[0], slot: 30 }, // not the business
    { tx: buildJobBriefTxs({ job: JOB_ADDRESS, business: BUSINESS, bytes: new TextEncoder().encode('{"v":1}') })[0], slot: 31, err: true }, // failed
    { tx: buildJobBriefTxs({ job: JOB_ADDRESS, business: BUSINESS, bytes: new TextEncoder().encode('{"v":2}') })[0], slot: 32, sigErr: true }, // failed
    { tx: other, slot: 33 },
  ];
  assert.equal((await fetchJobBrief({ address: JOB_ADDRESS, business: BUSINESS, briefHash: HASH }, rpc(entries))).status, 'ok');
});

const rec = (slot: number, part: number, parts: number, text: string): JobBriefRecord => ({ signature: `s${slot}`, slot, position: 0, part, parts, data: new TextEncoder().encode(text) });

test('the latest complete set wins; incomplete sets are ignored', () => {
  const sets = completeBriefSets([rec(1, 0, 2, 'ab'), rec(2, 1, 2, 'cd'), rec(3, 0, 1, 'x'), rec(4, 0, 3, 'p'), rec(5, 1, 3, 'q')]);
  assert.deepEqual(sets.map((s) => new TextDecoder().decode(s)), ['abcd', 'x']);
  // a repeated position starts a new set
  assert.deepEqual(completeBriefSets([rec(1, 0, 2, 'a'), rec(2, 0, 2, 'b'), rec(3, 1, 2, 'c')]).map((s) => new TextDecoder().decode(s)), ['bc']);
});

test('status: missing with no complete set, mismatch when the latest set does not hash to brief_hash', () => {
  assert.equal(readJobBrief(HASH, []).status, 'missing');
  assert.equal(readJobBrief(HASH, [rec(1, 0, 2, 'ab')]).status, 'missing');
  const json = new TextDecoder().decode(BYTES);
  assert.equal(readJobBrief(HASH, [rec(1, 0, 1, json)]).status, 'ok');
  assert.equal(readJobBrief(HASH, [rec(1, 0, 1, json), rec(2, 0, 1, json.replace('Logo', 'Lego'))]).status, 'mismatch');
  assert.equal(readJobBrief(HASH, [rec(1, 0, 1, 'not json')]).status, 'mismatch');
  assert.equal(readJobBrief(new Uint8Array(32), [rec(1, 0, 1, json)]).status, 'mismatch');
});

