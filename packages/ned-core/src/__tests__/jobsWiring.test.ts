// S4 jobs wiring against a fake connection: runAccept adds lock_from_job only for a job contract, Lock is refused for
// a job contract, runSelectJob sends create_fund + select_job in one transaction (closing a previous contract first).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'buffer';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { IDL_PROGRAM_ID } from '../constants.ts';
import { JOB_CONTRACT_LOCK, runAccept, runFundAction, runLockFromJob, type ActionEnv } from '../actions.ts';
import { runSelectJob } from '../jobs/actions.ts';
import { buildJobBriefTxs, jobBriefBytes } from '../jobs/brief.ts';
import { jobAppPda } from '../jobs/pda.ts';
import { coder } from '../milestone/decode.ts';
import { hashBytes } from '../milestone/content.ts';
import { memoryKeyStorage } from '../milestone/keys.ts';
import { BRIEF_HASH, fundBytes, FUND_ADDRESS, M, T0 } from '../milestone/__tests__/fixture.ts';
import { applicationBytes, jobBytes } from '../jobs/__tests__/fixture.ts';

const business = Keypair.generate();
const freelancer = Keypair.generate();
const JOB = Keypair.generate().publicKey;

/** Accounts by address, getProgramAccounts by the memcmp at 508 (jobForFund), and a recorder of sent transactions */
function chain(accounts: Map<string, Uint8Array>, listings: { pubkey: PublicKey; data: Uint8Array }[], briefTxs: Transaction[] = []) {
  const sent: string[][] = [];
  const names = (raw: Uint8Array) => {
    const tx = Transaction.from(Buffer.from(raw));
    return tx.instructions.filter((ix) => ix.programId.equals(IDL_PROGRAM_ID)).map((ix) => coder.instruction.decode(Buffer.from(ix.data))?.name ?? '?');
  };
  const conn = {
    sent,
    getAccountInfo: async (k: PublicKey) => {
      const data = accounts.get(k.toBase58());
      return data ? { owner: IDL_PROGRAM_ID, data, lamports: 1, executable: false } : null;
    },
    getProgramAccounts: async (_: PublicKey, config: { filters: { memcmp?: { offset: number; bytes: string } }[] }) => {
      const fund = config.filters.find((f) => f.memcmp?.offset === 508)?.memcmp?.bytes;
      return listings.filter((l) => !fund || new PublicKey(l.data.subarray(508, 540)).toBase58() === fund).map((l) => ({ pubkey: l.pubkey, account: { data: l.data } }));
    },
    getMinimumBalanceForRentExemption: async () => 1_000,
    getLatestBlockhash: async () => ({ blockhash: PublicKey.default.toBase58(), lastValidBlockHeight: 10 }),
    getFeeForMessage: async () => ({ value: 5_000 }),
    getBalance: async () => 10_000_000_000,
    sendRawTransaction: async (raw: Uint8Array) => {
      sent.push(names(raw));
      return `sig${sent.length}`;
    },
    confirmTransaction: async () => ({ context: { slot: 1 }, value: { err: null } }),
    getSignaturesForAddress: async () => briefTxs.map((_, i) => ({ signature: `b${i}`, err: null })).reverse(),
    getTransactions: async (list: string[]) =>
      list.map((s) => {
        const t = briefTxs[Number(s.slice(1))];
        t.feePayer = business.publicKey;
        t.recentBlockhash = PublicKey.default.toBase58();
        return { slot: 1 + Number(s.slice(1)), meta: { err: null }, transaction: { message: t.compileMessage() } };
      }),
  };
  return conn;
}

const env = (who: Keypair, connection: unknown, now = T0): ActionEnv => ({
  signer: { walletAddress: who.publicKey.toBase58(), signTransaction: async (t: Transaction) => (t.partialSign(who), t) },
  now: async () => now,
  connection: connection as never,
  keys: memoryKeyStorage(),
});

const createdFund = () => fundBytes({ state: 'Created', payoutKind: 'Unset', client: business.publicKey, freelancer: freelancer.publicKey, milestones: [M()] });

test('runAccept appends lock_from_job for a Selected job contract, and not for an ordinary contract', async () => {
  const accounts = new Map([[FUND_ADDRESS.toBase58(), createdFund()]]);
  const listing = { pubkey: JOB, data: jobBytes({ state: 'Selected', business: business.publicKey, selected: freelancer.publicKey, fund: FUND_ADDRESS, selectedAt: T0 }) };
  const job = chain(accounts, [listing]);
  await runAccept(env(freelancer, job), FUND_ADDRESS.toBase58(), 'ownWallet', '', BRIEF_HASH);
  assert.deepEqual(job.sent, [['accept', 'lock_from_job']]);

  const plain = chain(accounts, []);
  await runAccept(env(freelancer, plain), FUND_ADDRESS.toBase58(), 'ownWallet', '', BRIEF_HASH);
  assert.deepEqual(plain.sent, [['accept']]);

  const filled = chain(accounts, [{ pubkey: JOB, data: jobBytes({ state: 'Filled', fund: FUND_ADDRESS }) }]);
  await runAccept(env(freelancer, filled), FUND_ADDRESS.toBase58(), 'ownWallet', '', BRIEF_HASH);
  assert.deepEqual(filled.sent, [['accept']], 'only a Selected listing');
});

test('a job contract never gets the normal Lock; lock_from_job alone works when it is Accepted', async () => {
  const accepted = fundBytes({ state: 'Accepted', client: business.publicKey, freelancer: freelancer.publicKey, milestones: [M()] });
  const accounts = new Map([[FUND_ADDRESS.toBase58(), accepted]]);
  const listing = { pubkey: JOB, data: jobBytes({ state: 'Selected', business: business.publicKey, selected: freelancer.publicKey, fund: FUND_ADDRESS, selectedAt: T0 }) };
  const conn = chain(accounts, [listing]);
  await assert.rejects(runFundAction(env(business, conn), FUND_ADDRESS.toBase58(), 'lock'), (e: Error) => e.message === JOB_CONTRACT_LOCK);
  await runLockFromJob(env(Keypair.generate(), conn), FUND_ADDRESS.toBase58());
  assert.deepEqual(conn.sent, [['lock_from_job']]);
});

const BRIEF = { scope: 'A logo.', references: [], milestones: [{ name: 'Logo', criteria: ['SVG'] }] };

function selectChain(listing: Uint8Array, extra: [string, Uint8Array][] = []) {
  const accounts = new Map<string, Uint8Array>([[jobAppPda(JOB, freelancer.publicKey).toBase58(), applicationBytes({ job: JOB, freelancer: freelancer.publicKey })], [JOB.toBase58(), listing], ...extra]);
  const bytes = jobBriefBytes('Logo for a café', BRIEF);
  return chain(accounts, [], buildJobBriefTxs({ job: JOB, business: business.publicKey, bytes }));
}
const briefHash = hashBytes(jobBriefBytes('Logo for a café', BRIEF));

test('runSelectJob: create_fund + select_job in one transaction, with the listing title, brief and template', async () => {
  const conn = selectChain(jobBytes({ business: business.publicKey, applicationCount: 1, briefHash, milestones: [{ amount: 1_000_000_000n, workSecs: 600, reviewSecs: 120 }] }));
  const result = await runSelectJob(env(business, conn), JOB.toBase58(), freelancer.publicKey.toBase58());
  assert.deepEqual(conn.sent[0], ['create_fund', 'select_job']);
  assert.ok(conn.sent.slice(1).every((names) => names.every((n) => n === 'post_note')), 'then the brief notes');
  assert.equal(result.job, JOB.toBase58());
  assert.match(result.inviteLink, /#k=/);
});

test('runSelectJob refuses a non-applicant, a missing brief and a stranger', async () => {
  const listing = jobBytes({ business: business.publicKey, applicationCount: 1, briefHash });
  await assert.rejects(runSelectJob(env(business, selectChain(listing)), JOB.toBase58(), Keypair.generate().publicKey.toBase58()), /not applied/);
  await assert.rejects(runSelectJob(env(freelancer, selectChain(listing)), JOB.toBase58(), freelancer.publicKey.toBase58()), /not available/);
  const wrongHash = jobBytes({ business: business.publicKey, applicationCount: 1, briefHash: new Uint8Array(32).fill(9) });
  await assert.rejects(runSelectJob(env(business, selectChain(wrongHash)), JOB.toBase58(), freelancer.publicKey.toBase58()), /brief/);
});

test('re-select after the accept window closes the previous contract before create_fund', async () => {
  const listing = jobBytes({ state: 'Selected', business: business.publicKey, applicationCount: 2, briefHash, selected: freelancer.publicKey, selectedAt: T0 - 200, fund: FUND_ADDRESS });
  const conn = selectChain(listing, [[FUND_ADDRESS.toBase58(), createdFund()]]);
  await runSelectJob(env(business, conn), JOB.toBase58(), freelancer.publicKey.toBase58());
  const flat = conn.sent.flat();
  assert.ok(flat.indexOf('close') >= 0 && flat.indexOf('close') < flat.indexOf('create_fund'), 'close first');
  assert.ok(conn.sent.some((names) => names.includes('create_fund') && names.at(-1) === 'select_job'));
});

