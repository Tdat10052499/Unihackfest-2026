import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, PublicKey, TransactionInstruction, TransactionMessage, type VersionedTransactionResponse } from '@solana/web3.js';
import { IDL_PROGRAM_ID as PROGRAM_ID } from '../../constants.ts';
import { encodeIx, toBN } from '../../chain/idl.ts';
import { coder, decodeFund } from '../decode.ts';
import { memoryKeyStorage } from '../keys.ts';
import {
  CSV_HEADER,
  emptyRecords,
  groupByMonth,
  loadRecords,
  RECORDS_PREFIX,
  recordsCsv,
  saveRecords,
  syncRecords,
  type ReleaseRecord,
} from '../records.ts';
import { CLIENT, FREELANCER, fundBytes, M, T0, USDC } from './fixture.ts';

const FUND = Keypair.generate().publicKey;
const DEST_TOKEN = Keypair.generate().publicKey;
const other = () => Keypair.generate().publicKey;

function ix(name: string, accounts: PublicKey[], args: Record<string, unknown>) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: accounts.map((pubkey) => ({ pubkey, isSigner: false, isWritable: true })),
    data: encodeIx(coder, name, args),
  });
}

/** A confirmed transaction as getTransactions returns it */
function tx(instruction: TransactionInstruction, blockTime: number, balances?: { pre: string; post: string }): VersionedTransactionResponse {
  const message = new TransactionMessage({ payerKey: CLIENT, recentBlockhash: '11111111111111111111111111111111', instructions: [instruction] }).compileToLegacyMessage();
  const index = message.accountKeys.findIndex((k) => k.equals(DEST_TOKEN));
  const bal = (amount: string) => [{ accountIndex: index, mint: '', uiTokenAmount: { amount, decimals: 6, uiAmount: null, uiAmountString: '' } }];
  return {
    slot: 1,
    blockTime,
    transaction: { message, signatures: [] },
    meta: { err: null, fee: 5000, preBalances: [], postBalances: [], preTokenBalances: balances ? bal(balances.pre) : [], postTokenBalances: balances ? bal(balances.post) : [] },
  } as unknown as VersionedTransactionResponse;
}

const create = tx(
  ix('create_fund', [CLIENT, CLIENT, FUND, other(), other(), other(), other()], {
    fund_id: toBN(1),
    freelancer: FREELANCER,
    title: 'Landing page design',
    milestones: [{ amount: toBN(10n * USDC), submit_by: toBN(T0), review_by: toBN(T0 + 60) }],
    brief_hash: Array(32).fill(5),
  }),
  T0
);
const accept = tx(
  ix('accept', [FUND, FREELANCER], {
    payout_kind: { PayoutPartner: {} },
    payout_destination: other(),
    payout_reference: Array(32).fill(0),
    expected_brief_hash: Array(32).fill(5),
  }),
  T0 + 10
);
const RELEASED_AT = Date.UTC(2026, 9, 3, 9, 46) / 1000;
const approve = tx(ix('approve', [FUND, CLIENT, other(), DEST_TOKEN, other(), other(), other()], { index: 0 }), RELEASED_AT, {
  pre: '0',
  post: '10000000',
});

/** Fake RPC: signatures newest first, as the node returns them */
function rpc(history: Record<string, [string, VersionedTransactionResponse][]>) {
  const all = new Map(Object.values(history).flat());
  const calls: string[] = [];
  return {
    calls,
    getSignaturesForAddress: async (address: PublicKey, opts: { until?: string }) => {
      calls.push(`sigs:${address.toBase58()}${opts.until ? `:until=${opts.until}` : ''}`);
      const list = [...(history[address.toBase58()] ?? [])].reverse();
      const stop = opts.until ? list.findIndex(([s]) => s === opts.until) : -1;
      return (stop >= 0 ? list.slice(0, stop) : list).map(([signature, t]) => ({ signature, err: null, blockTime: t.blockTime, slot: 1 }));
    },
    getTransactions: async (sigs: string[]) => sigs.map((s) => all.get(s) ?? null),
  };
}

test('a contract closed on another device is found through the freelancer’s accept and read once', async () => {
  const conn = rpc({
    [FREELANCER.toBase58()]: [['acc', accept]],
    [FUND.toBase58()]: [
      ['cre', create],
      ['acc', accept],
      ['app', approve],
    ],
  });
  const first = await syncRecords(conn as never, FREELANCER.toBase58(), [], emptyRecords());
  assert.equal(first.records.length, 1);
  const r = first.records[0];
  assert.deepEqual(
    { id: r.id, title: r.title, client: r.client, amount: r.amountUnits, at: r.releasedAt, sig: r.signature, dest: r.destination },
    { id: `${FUND.toBase58()}:0`, title: 'Landing page design', client: CLIENT.toBase58(), amount: '10000000', at: RELEASED_AT, sig: 'app', dest: 'payoutPartner' }
  );
  assert.deepEqual(first.done, [FUND.toBase58()]);
  assert.equal(first.until, 'acc');

  conn.calls.length = 0;
  const second = await syncRecords(conn as never, FREELANCER.toBase58(), [], first);
  assert.equal(second, first, 'nothing new: same object');
  assert.deepEqual(conn.calls, [`sigs:${FREELANCER.toBase58()}:until=acc`]);
});

test('an open contract with a new release is read for its date and transaction; amounts come from the account', async () => {
  const open = decodeFund(FUND, fundBytes({ payoutKind: 'OwnWallet', milestones: [M('Released', { amount: 7n * USDC })] }));
  const conn = rpc({
    [FREELANCER.toBase58()]: [['acc', accept]],
    [FUND.toBase58()]: [
      ['cre', create],
      ['acc', accept],
      ['app', approve],
    ],
  });
  const next = await syncRecords(conn as never, FREELANCER.toBase58(), [open], emptyRecords());
  assert.equal(next.records.length, 1);
  assert.equal(next.records[0].amountUnits, String(7n * USDC));
  assert.equal(next.records[0].destination, 'ownWallet');
  assert.deepEqual(next.done, [], 'open contracts are not marked done');
  // as client, nothing is recorded
  const asClient = await syncRecords(rpc({}) as never, CLIENT.toBase58(), [open], emptyRecords());
  assert.equal(asClient.records.length, 0);
});

const rec = (over: Partial<ReleaseRecord>): ReleaseRecord => ({
  id: 'f:0',
  fund: 'f',
  index: 0,
  title: 'Logo refresh',
  client: CLIENT.toBase58(),
  amountUnits: String(10n * USDC),
  releasedAt: Date.UTC(2026, 9, 3, 12) / 1000,
  signature: 'sig',
  destination: 'ownWallet',
  ...over,
});

test('groupByMonth: newest month first with totals', () => {
  const months = groupByMonth([
    rec({ id: 'a', releasedAt: Date.UTC(2026, 8, 15, 12) / 1000, amountUnits: '2500000' }),
    rec({ id: 'b' }),
    rec({ id: 'c', releasedAt: Date.UTC(2026, 9, 10, 12) / 1000 }),
  ]);
  assert.deepEqual(
    months.map((m) => [m.key, m.label, m.records.map((r) => r.id), m.totalUnits]),
    [
      ['2026-10', 'October 2026', ['c', 'b'], 20n * USDC],
      ['2026-09', 'September 2026', ['a'], 2_500_000n],
    ]
  );
});

test('recordsCsv: header, oldest first, quoted titles, VND estimate at the fixed rate', () => {
  const csv = recordsCsv([rec({ id: 'b', title: 'Logo, "v2"', index: 1 }), rec({ id: 'a', releasedAt: Date.UTC(2026, 9, 1) / 1000, destination: 'payoutPartner' })]);
  const lines = csv.trim().split('\n');
  assert.equal(lines[0], CSV_HEADER.join(','));
  assert.match(lines[1], /^2026-10-01T00:00:00\.000Z,f,1,Logo refresh,\w+,10\.00,260000,26019\.5,2026-10-02,payout partner \(simulated\),https:\/\/explorer\.solana\.com\/tx\/sig\?cluster=devnet$/);
  assert.match(lines[2], /,2,"Logo, ""v2""",/);
});

test('cache round trip per wallet; a broken cache starts empty', async () => {
  const storage = memoryKeyStorage();
  await saveRecords(storage, 'w', { ...emptyRecords(), records: [rec({})] });
  assert.equal((await loadRecords(storage, 'w')).records.length, 1);
  assert.equal((await loadRecords(storage, 'other')).records.length, 0);
  await storage.setItem(RECORDS_PREFIX + 'w', '{oops');
  assert.deepEqual(await loadRecords(storage, 'w'), emptyRecords());
});
