import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { buildLockFromJobIx } from '../../jobs/client.ts';
import { buildDispute } from '../client.ts';
import { readFundHistory, recordsCsv, RECORDS_CSV_FILENAME, RECORDS_CSV_NOTE } from '../records.ts';
import { CLIENT, fund, FUND_ADDRESS, M } from './fixture.ts';

const payer = Keypair.generate().publicKey;
const response = (ixs: Transaction, slot: number) => {
  ixs.feePayer = payer;
  ixs.recentBlockhash = PublicKey.default.toBase58();
  return { slot, blockTime: 1_000 + slot, meta: { err: null }, transaction: { message: ixs.compileMessage() } };
};

test('readFundHistory: lock_from_job is the lock step of a job contract; dispute is "changes requested"', async () => {
  const job = Keypair.generate().publicKey;
  const lock = new Transaction().add(buildLockFromJobIx({ job, business: CLIENT, fund: FUND_ADDRESS, caller: payer }));
  const dispute = (await buildDispute({ fund: fund({ milestones: [M('Submitted')] }), client: CLIENT, index: 0 })).tx;
  const txs = [response(lock, 1), response(dispute, 2)];
  const conn = {
    getSignaturesForAddress: async () => [{ signature: 'b', err: null }, { signature: 'a', err: null }],
    getTransactions: async (sigs: string[]) => sigs.map((s) => txs[s === 'a' ? 0 : 1]),
  };
  const history = await readFundHistory(conn as never, FUND_ADDRESS.toBase58());
  assert.deepEqual(history.map((h) => [h.step, h.instruction, h.index ?? null, h.time]), [
    ['locked', 'lock_from_job', null, 1_001],
    ['changesRequested', 'dispute', 0, 1_002],
  ]);
  assert.deepEqual(await readFundHistory(conn as never, Keypair.generate().publicKey.toBase58()), [], 'another contract');
});

test('F2: every CSV row carries the note; the file name says devnet', () => {
  const csv = recordsCsv([{ id: 'f:0', fund: 'f', index: 0, title: 'T', client: 'c', amountUnits: '1000000', releasedAt: 1, signature: 's', destination: 'ownWallet' }]);
  const [header, row] = csv.trim().split('\n');
  assert.ok(header.endsWith(',note'));
  assert.ok(row.endsWith(`,${RECORDS_CSV_NOTE}`));
  assert.equal(RECORDS_CSV_FILENAME, 'ned-records-devnet.csv');
});
