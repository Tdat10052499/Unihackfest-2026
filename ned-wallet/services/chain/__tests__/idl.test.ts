import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Keypair, PublicKey } from '@solana/web3.js';
import type { Idl } from '@coral-xyz/anchor';
import draft from './fixtures/milestone-draft-idl.json' with { type: 'json' };
import { buildIx, decodeAccount, encodeIx, fromBN, loadCoder, toBN } from '../idl.ts';

const idl = draft as unknown as Idl;
const coder = loadCoder(idl);
const PROGRAM_ID = new PublicKey(draft.address);
const sighash = (s: string) => [...createHash('sha256').update(s).digest().subarray(0, 8)];

// Hand-written Borsh pieces
const u8 = (v: number) => Buffer.from([v]);
const u32 = (v: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(v); return b; };
const u64 = (v: bigint) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(v); return b; };
const i64 = (v: bigint) => { const b = Buffer.alloc(8); b.writeBigInt64LE(v); return b; };
const bytes32 = (seed: number) => Buffer.from(Array.from({ length: 32 }, (_, i) => (seed + i) & 0xff));

const keys = Array.from({ length: 7 }, () => Keypair.generate().publicKey);
const [client, freelancer, creator, rentPayer, destination, cancelProposer] = keys;
const mint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

test('fixture discriminators are Anchor sighashes', () => {
  assert.deepEqual(draft.instructions[0].discriminator, sighash('global:create_fund'));
  assert.deepEqual(draft.instructions[1].discriminator, sighash('global:accept'));
  assert.deepEqual(draft.accounts[0].discriminator, sighash('account:SharedFund'));
});

test('(a) create_fund encodes to the hand-computed Borsh buffer', () => {
  const fundId = 1_759_400_000_123n; // Date.now() style
  const milestones = [
    { amount: 10_000_000n, submitBy: 1_759_400_300n, reviewBy: 1_759_400_360n },
    { amount: 18_446_744_073_709_551_615n, submitBy: -1n, reviewBy: 9_223_372_036_854_775_807n }, // u64 max, i64 edges
  ];
  const title = 'Landing page · thiết kế'; // multi-byte UTF-8
  const data = encodeIx(coder, 'create_fund', {
    fund_id: toBN(fundId),
    freelancer,
    title,
    milestones: milestones.map((m) => ({ amount: toBN(m.amount), submit_by: toBN(m.submitBy), review_by: toBN(m.reviewBy) })),
  });
  const titleBytes = Buffer.from(title, 'utf8');
  const expected = Buffer.concat([
    Buffer.from(sighash('global:create_fund')),
    u64(fundId),
    freelancer.toBuffer(),
    u32(titleBytes.length), titleBytes,
    u32(milestones.length),
    ...milestones.flatMap((m) => [u64(m.amount), i64(m.submitBy), i64(m.reviewBy)]),
  ]);
  assert.equal(data.toString('hex'), expected.toString('hex'));
  assert.equal(data.length, 8 + 8 + 32 + 4 + titleBytes.length + 4 + 24 * 2);
});

test('(a) accept encodes enum index, destination and reference', () => {
  const reference = bytes32(7);
  const data = encodeIx(coder, 'accept', { payout_kind: { PayoutPartner: {} }, payout_destination: destination, payout_reference: [...reference] });
  assert.equal(data.toString('hex'), Buffer.concat([Buffer.from(sighash('global:accept')), u8(2), destination.toBuffer(), reference]).toString('hex'));
});

/** SharedFund built byte by byte from program-spec 3.1. */
function handFund() {
  const buf = Buffer.alloc(708);
  Buffer.from(sighash('account:SharedFund')).copy(buf, 0);
  buf[8] = 1; // version
  buf[9] = 0; // kind Milestone
  buf[10] = 2; // state Funded
  buf[11] = 2; // payout_kind PayoutPartner
  client.toBuffer().copy(buf, 12);
  freelancer.toBuffer().copy(buf, 44);
  creator.toBuffer().copy(buf, 76);
  rentPayer.toBuffer().copy(buf, 108);
  destination.toBuffer().copy(buf, 140);
  mint.toBuffer().copy(buf, 172);
  buf.writeBigUInt64LE(1_759_400_000_123n, 204); // fund_id
  buf.writeBigInt64LE(1_759_400_000n, 212); // created_at
  buf.writeBigUInt64LE(20_000_000n, 220); // total
  buf.writeBigUInt64LE(10_000_000n, 228); // released
  buf.writeBigUInt64LE(0n, 236); // refunded
  buf[244] = 5; // milestone_count (all slots used so every status value appears)
  for (let i = 0; i < 5; i++) {
    const o = 245 + i * 65;
    buf.writeBigUInt64LE(BigInt(i + 1) * 1_000_000n, o); // amount
    buf.writeBigInt64LE(1_759_400_300n + BigInt(i), o + 8); // submit_by
    buf.writeBigInt64LE(1_759_400_360n + BigInt(i), o + 16); // review_by
    buf.writeBigInt64LE(i === 0 ? 1_759_400_100n : 0n, o + 24); // submitted_at
    bytes32(40 + i).copy(buf, o + 32); // evidence
    buf[o + 64] = [3, 1, 2, 4, 5][i]; // status: Released, Submitted, Disputed, Refunded, Cancelled
  }
  cancelProposer.toBuffer().copy(buf, 570);
  buf.writeBigUInt64LE(4_000_000n, 602); // cancel_freelancer_amount
  Buffer.from('Landing page design', 'utf8').copy(buf, 610); // title, zero-padded
  buf[642] = 254; // bump
  buf[643] = 253; // vault_bump
  bytes32(100).copy(buf, 644); // payout_reference
  // _reserved 676..708 stays zero
  return buf;
}

type Decoded = Record<string, any>;

test('(b) a hand-built 708-byte SharedFund decodes field by field', () => {
  assert.equal(coder.accounts.size('SharedFund'), 708);
  const f = decodeAccount<Decoded>(coder, 'SharedFund', handFund());
  assert.equal(f.version, 1);
  assert.deepEqual(f.kind, { Milestone: {} });
  assert.deepEqual(f.state, { Funded: {} });
  assert.deepEqual(f.payout_kind, { PayoutPartner: {} });
  assert.ok(f.client.equals(client));
  assert.ok(f.freelancer.equals(freelancer));
  assert.ok(f.creator.equals(creator));
  assert.ok(f.rent_payer.equals(rentPayer));
  assert.ok(f.payout_destination.equals(destination));
  assert.ok(f.mint.equals(mint));
  assert.equal(fromBN(f.fund_id), 1_759_400_000_123n);
  assert.equal(fromBN(f.created_at), 1_759_400_000n);
  assert.equal(fromBN(f.total), 20_000_000n);
  assert.equal(fromBN(f.released), 10_000_000n);
  assert.equal(fromBN(f.refunded), 0n);
  assert.equal(f.milestone_count, 5);
  assert.equal(f.milestones.length, 5);
  const statuses = ['Released', 'Submitted', 'Disputed', 'Refunded', 'Cancelled'];
  f.milestones.forEach((m: Decoded, i: number) => {
    assert.equal(fromBN(m.amount), BigInt(i + 1) * 1_000_000n);
    assert.equal(fromBN(m.submit_by), 1_759_400_300n + BigInt(i));
    assert.equal(fromBN(m.review_by), 1_759_400_360n + BigInt(i));
    assert.equal(fromBN(m.submitted_at), i === 0 ? 1_759_400_100n : 0n);
    assert.deepEqual(Buffer.from(m.evidence), bytes32(40 + i));
    assert.deepEqual(m.status, { [statuses[i]]: {} });
  });
  assert.ok(f.cancel_proposer.equals(cancelProposer));
  assert.equal(fromBN(f.cancel_freelancer_amount), 4_000_000n);
  assert.equal(Buffer.from(f.title).toString('utf8').replace(/\0+$/, ''), 'Landing page design');
  assert.equal(f.bump, 254);
  assert.equal(f.vault_bump, 253);
  assert.deepEqual(Buffer.from(f.payout_reference), bytes32(100));
  assert.deepEqual(Buffer.from(f._reserved), Buffer.alloc(32));
});

test('(b) client at offset 12 and freelancer at 44 (memcmp filters)', () => {
  const buf = handFund();
  assert.ok(new PublicKey(buf.subarray(12, 44)).equals(client));
  assert.ok(new PublicKey(buf.subarray(44, 76)).equals(freelancer));
});

test('(b) a wrong discriminator is rejected', () => {
  const buf = handFund();
  buf[0] ^= 0xff;
  assert.throws(() => decodeAccount(coder, 'SharedFund', buf));
});

test('(c) SharedFund round-trips: decode → encode gives the same 708 bytes', async () => {
  const buf = handFund();
  const decoded = decodeAccount<Decoded>(coder, 'SharedFund', buf);
  const encoded = await coder.accounts.encode('SharedFund', decoded);
  assert.equal(encoded.length, 708);
  assert.equal(encoded.toString('hex'), buf.toString('hex'));
});

test('(c) every enum variant round-trips through instruction encode/decode', () => {
  ['Unset', 'OwnWallet', 'PayoutPartner'].forEach((variant, index) => {
    const data = encodeIx(coder, 'accept', { payout_kind: { [variant]: {} }, payout_destination: destination, payout_reference: new Array(32).fill(0) });
    assert.equal(data[8], index);
    const back = coder.instruction.decode(data);
    assert.equal(back?.name, 'accept');
    assert.deepEqual((back?.data as Decoded).payout_kind, { [variant]: {} });
  });
  assert.throws(() => encodeIx(coder, 'accept', { payout_kind: { ownWallet: {} }, payout_destination: destination, payout_reference: new Array(32).fill(0) }));
});

test('buildIx takes the account order and flags from the IDL and fills fixed addresses', () => {
  const data = encodeIx(coder, 'accept', { payout_kind: { OwnWallet: {} }, payout_destination: freelancer, payout_reference: new Array(32).fill(0) });
  const accept = buildIx(draft, PROGRAM_ID, 'accept', { freelancer, fund: client }, data);
  assert.deepEqual(accept.keys.map((k) => [k.pubkey.toBase58(), k.isSigner, k.isWritable]), [
    [client.toBase58(), false, true],
    [freelancer.toBase58(), true, false],
  ]);
  assert.ok(accept.programId.equals(PROGRAM_ID));
  assert.ok(accept.data.equals(data));

  const tokenProgram = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  const create = buildIx(draft, PROGRAM_ID, 'create_fund', { client, payer: client, fund: creator, vault: rentPayer, token_program: tokenProgram }, Buffer.alloc(8));
  assert.deepEqual(create.keys.map((k) => k.pubkey.toBase58()), [
    client.toBase58(), client.toBase58(), creator.toBase58(), rentPayer.toBase58(),
    mint.toBase58(), tokenProgram.toBase58(), '11111111111111111111111111111111',
  ]);
  assert.throws(() => buildIx(draft, PROGRAM_ID, 'accept', { fund: client }, data), /Missing account freelancer/);
});
