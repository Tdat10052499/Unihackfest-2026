import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey, SystemProgram, type TransactionInstruction } from '@solana/web3.js';
import { ATA_PROGRAM_ID, DEMO_PAYOUT_PARTNER, IDL_PROGRAM_ID as PROGRAM_ID, TOKEN_PROGRAM_ID, USDC_DEVNET_MINT } from '../../constants.ts';
import { ata } from '../../chain/ata.ts';
import * as client from '../client.ts';
import { coder } from '../decode.ts';
import { evidenceHash } from '../evidence.ts';
import { fundPda, vaultPda } from '../pda.ts';
import { payoutReference } from '../reference.ts';
import { BRIEF_HASH, CLIENT, FREELANCER, fund, FUND_ADDRESS, M, STRANGER, T0, USDC } from './fixture.ts';

const RENT_165 = 2_039_280;
/** Rent of a 740-byte account (devnet getMinimumBalanceForRentExemption) */
const RENT_740 = 4_409_440;
/** Fake RPC: ATAs in `existing` are present; rent per size */
function conn(existing: PublicKey[] = []) {
  const set = new Set(existing.map((k) => k.toBase58()));
  return {
    getAccountInfo: async (k: PublicKey) => (set.has(k.toBase58()) ? ({} as never) : null),
    getMinimumBalanceForRentExemption: async (size: number) => (size === 165 ? RENT_165 : size === 740 ? RENT_740 : 0),
  };
}
const program = (ixs: TransactionInstruction[]) => ixs.find((i) => i.programId.equals(PROGRAM_ID))!;
const decoded = (ixs: TransactionInstruction[]) => coder.instruction.decode(Buffer.from(program(ixs).data))!;
const keys = (i: TransactionInstruction) => i.keys.map((k) => [k.pubkey.toBase58(), k.isSigner, k.isWritable]);
const isAtaCreate = (i: TransactionInstruction, owner: PublicKey) =>
  i.programId.equals(ATA_PROGRAM_ID) && i.data.length === 1 && i.data[0] === 1 && i.keys[2].pubkey.equals(owner);

test('create_fund: args, account order from the IDL, rent of fund + vault', async () => {
  const built = await client.buildCreateFund(
    { client: CLIENT, freelancer: FREELANCER, title: 'Landing page design', fundId: 42n, milestones: [{ amount: 10n * USDC, submitBy: T0 + 600, reviewBy: T0 + 720 }] },
    conn()
  );
  const fundKey = fundPda(CLIENT, 42n);
  assert.ok(built.fund.equals(fundKey));
  assert.equal(built.fundId, 42n);
  assert.equal(built.rent, RENT_740 + RENT_165);
  assert.equal(built.tx.instructions.length, 1);
  assert.deepEqual(keys(built.tx.instructions[0]), [
    [CLIENT.toBase58(), true, false],
    [CLIENT.toBase58(), true, true],
    [fundKey.toBase58(), false, true],
    [vaultPda(fundKey).toBase58(), false, true],
    [USDC_DEVNET_MINT.toBase58(), false, false],
    [TOKEN_PROGRAM_ID.toBase58(), false, false],
    [SystemProgram.programId.toBase58(), false, false],
  ]);
  const d = decoded(built.tx.instructions);
  assert.equal(d.name, 'create_fund');
  const args = d.data as any;
  assert.equal(args.fund_id.toString(), '42');
  assert.ok(args.freelancer.equals(FREELANCER));
  assert.equal(args.title, 'Landing page design');
  assert.deepEqual(args.milestones.map((m: any) => [m.amount.toString(), m.submit_by.toNumber(), m.review_by.toNumber()]), [['10000000', T0 + 600, T0 + 720]]);
  // TEMPORARY until B1: the brief hash defaults to SHA-256 of the title
  assert.deepEqual(Uint8Array.from(args.brief_hash), client.temporaryBriefHash('Landing page design'));
});

test('create_fund passes an explicit brief hash and refuses an all-zero one', async () => {
  const base = { client: CLIENT, freelancer: FREELANCER, title: 't', fundId: 1n, milestones: [{ amount: 1n, submitBy: 1, reviewBy: 61 }] };
  const built = await client.buildCreateFund({ ...base, briefHash: BRIEF_HASH }, conn());
  assert.deepEqual(Uint8Array.from((decoded(built.tx.instructions).data as any).brief_hash), BRIEF_HASH);
  await assert.rejects(client.buildCreateFund({ ...base, briefHash: new Uint8Array(32) }, conn()), /brief fingerprint/);
});

test('create_fund with a separate payer; default fund id is the current time in ms', async () => {
  const before = BigInt(Date.now());
  const built = await client.buildCreateFund({ client: CLIENT, payer: STRANGER, freelancer: FREELANCER, title: 't', milestones: [{ amount: 1n, submitBy: 1, reviewBy: 61 }] }, conn());
  assert.ok(built.fundId >= before && built.fundId <= BigInt(Date.now()));
  assert.deepEqual(keys(built.tx.instructions[0]).slice(0, 2), [[CLIENT.toBase58(), true, false], [STRANGER.toBase58(), true, true]]);
});

test('accept: ownWallet → freelancer + zero reference; payoutPartner → DEMO_PAYOUT_PARTNER + sha256(demo-<username>-001)', async () => {
  const f = fund({ state: 'Created', payoutKind: 'Unset', milestones: [M()] });
  const own = decoded((await client.buildAccept({ fund: f, freelancer: FREELANCER, choice: 'ownWallet', username: 'vinh', expectedBriefHash: BRIEF_HASH })).tx.instructions);
  assert.equal(own.name, 'accept');
  assert.deepEqual((own.data as any).payout_kind, { OwnWallet: {} });
  assert.ok((own.data as any).payout_destination.equals(FREELANCER));
  assert.deepEqual([...(own.data as any).payout_reference], new Array(32).fill(0));
  assert.deepEqual(Uint8Array.from((own.data as any).expected_brief_hash), BRIEF_HASH);

  const vn = await client.buildAccept({ fund: f, freelancer: FREELANCER, choice: 'payoutPartner', username: 'vinh', expectedBriefHash: BRIEF_HASH });
  const d = decoded(vn.tx.instructions);
  assert.deepEqual((d.data as any).payout_kind, { PayoutPartner: {} });
  assert.ok((d.data as any).payout_destination.equals(DEMO_PAYOUT_PARTNER));
  assert.deepEqual(Uint8Array.from((d.data as any).payout_reference), payoutReference('demo-vinh-001'));
  assert.deepEqual(keys(vn.tx.instructions[0]), [[FUND_ADDRESS.toBase58(), false, true], [FREELANCER.toBase58(), true, false]]);
  assert.equal(vn.rent, 0);
  await assert.rejects(client.buildAccept({ fund: f, freelancer: FREELANCER, choice: 'payoutPartner', username: '', expectedBriefHash: BRIEF_HASH }), /username/);
  // own wallet needs no username
  await client.buildAccept({ fund: f, freelancer: FREELANCER, choice: 'ownWallet', username: '', expectedBriefHash: BRIEF_HASH });
});

test('ATA create-idempotent is added where program-spec 4.1 needs the ATA; rent only if it is missing', async () => {
  const funded = fund({ milestones: [M('Submitted')] });
  const settled = fund({ state: 'Settled', milestones: [M('Released')] });
  const disputed = fund({ milestones: [M('Disputed')] });
  const cases: [string, Promise<client.Built>, PublicKey, PublicKey][] = [
    ['lock', client.buildLock({ fund: fund({ state: 'Accepted', milestones: [M()] }), client: CLIENT }, conn()), CLIENT, CLIENT],
    ['approve', client.buildApprove({ fund: funded, client: CLIENT, index: 0 }, conn()), FREELANCER, CLIENT],
    ['release_after_review', client.buildReleaseAfterReview({ fund: funded, caller: STRANGER, index: 0 }, conn()), FREELANCER, STRANGER],
    ['refund', client.buildRefund({ fund: fund({ milestones: [M()] }), caller: STRANGER, index: 0 }, conn()), CLIENT, STRANGER],
    ['close', client.buildClose({ fund: settled, creator: CLIENT }, conn()), CLIENT, CLIENT],
    ['concede', client.buildConcede({ fund: disputed, freelancer: FREELANCER, index: 0 }, conn()), CLIENT, FREELANCER],
  ];
  for (const [name, promise, owner, payer] of cases) {
    const built = await promise;
    const ixs = built.tx.instructions;
    assert.equal(ixs.length, 2, name);
    assert.ok(isAtaCreate(ixs[0], owner), `${name}: ATA of ${owner.toBase58()}`);
    assert.ok(ixs[0].keys[0].pubkey.equals(payer) && ixs[0].keys[0].isSigner, `${name}: paid by the signer`);
    assert.equal(built.rent, RENT_165, name);
    assert.equal(decoded(ixs).name, name);
  }
  const existing = await client.buildApprove({ fund: funded, client: CLIENT, index: 0 }, conn([ata(USDC_DEVNET_MINT, FREELANCER)]));
  assert.equal(existing.rent, 0, 'ATA already exists');
  assert.equal(existing.tx.instructions.length, 2, 'the idempotent instruction is still included');
});

test('approve / release go to the fixed destination; refund / close / concede to the client ATA', async () => {
  const partnerFund = fund({ payoutKind: 'PayoutPartner', payoutDestination: DEMO_PAYOUT_PARTNER, milestones: [M('Submitted')] });
  const approve = (await client.buildApprove({ fund: partnerFund, client: CLIENT, index: 0 }, conn())).tx.instructions;
  assert.deepEqual(keys(program(approve)), [
    [FUND_ADDRESS.toBase58(), false, true],
    [CLIENT.toBase58(), true, false],
    [DEMO_PAYOUT_PARTNER.toBase58(), false, false],
    [ata(USDC_DEVNET_MINT, DEMO_PAYOUT_PARTNER).toBase58(), false, true],
    [vaultPda(FUND_ADDRESS).toBase58(), false, true],
    [USDC_DEVNET_MINT.toBase58(), false, false],
    [TOKEN_PROGRAM_ID.toBase58(), false, false],
  ]);
  assert.equal((decoded(approve).data as any).index, 0);
  const close = (await client.buildClose({ fund: fund({ state: 'Created', milestones: [M()] }), creator: CLIENT }, conn())).tx.instructions;
  assert.deepEqual(keys(program(close)).map((k) => k[0]), [
    FUND_ADDRESS.toBase58(), CLIENT.toBase58(), CLIENT.toBase58(), CLIENT.toBase58(),
    ata(USDC_DEVNET_MINT, CLIENT).toBase58(), vaultPda(FUND_ADDRESS).toBase58(), USDC_DEVNET_MINT.toBase58(), TOKEN_PROGRAM_ID.toBase58(),
  ]);
});

test('submit stores the SHA-256 of the trimmed link', async () => {
  const built = await client.buildSubmit({ fund: fund({ milestones: [M(), M()] }), freelancer: FREELANCER, index: 1, link: ' https://figma.com/x ' });
  assert.deepEqual(built.evidence, evidenceHash('https://figma.com/x'));
  const d = decoded(built.tx.instructions);
  assert.equal((d.data as any).index, 1);
  assert.deepEqual(Uint8Array.from((d.data as any).evidence), evidenceHash('https://figma.com/x'));
  await assert.rejects(client.buildSubmit({ fund: fund({ milestones: [M()] }), freelancer: FREELANCER, index: 256, link: 'x' }), /index/);
});

test('P1 builders: dispute, propose split, accept split with the expected values from the fund', async () => {
  assert.equal(decoded((await client.buildDispute({ fund: fund({ milestones: [M('Submitted')] }), client: CLIENT, index: 0 })).tx.instructions).name, 'dispute');
  const propose = decoded((await client.buildProposeSplit({ fund: fund({ milestones: [M()] }), signer: FREELANCER, toFreelancerUnits: 7n * USDC })).tx.instructions);
  assert.equal(propose.name, 'propose_cancel');
  assert.equal((propose.data as any).freelancer_amount.toString(), '7000000');

  const proposed = fund({ milestones: [M('Released'), M(), M()], cancelProposer: CLIENT, cancelFreelancerAmount: 12n * USDC });
  const built = await client.buildAcceptSplit({ fund: proposed, signer: FREELANCER }, conn());
  const ixs = built.tx.instructions;
  assert.equal(ixs.length, 3);
  assert.ok(isAtaCreate(ixs[0], FREELANCER) && isAtaCreate(ixs[1], CLIENT));
  assert.equal(built.rent, 2 * RENT_165);
  const d = decoded(ixs);
  assert.equal(d.name, 'accept_cancel');
  assert.equal((d.data as any).expected_freelancer_amount.toString(), '12000000');
  assert.equal((d.data as any).expected_unsettled.toString(), '20000000');
});
