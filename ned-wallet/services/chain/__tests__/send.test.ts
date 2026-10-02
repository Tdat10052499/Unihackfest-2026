import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import { sendAndConfirm } from '../send.ts';
import { TxFailedError, UserFacingError } from '../errors.ts';

const wallet = Keypair.generate();
const prepared = { fee: 5_000, rent: 0, total: 5_000, blockhash: '11111111111111111111111111111111', lastValidBlockHeight: 100 };

function tx() {
  const t = new Transaction().add(SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: Keypair.generate().publicKey, lamports: 1 }));
  t.feePayer = wallet.publicKey;
  t.recentBlockhash = prepared.blockhash;
  return t;
}

function fakeConnection({ balance = 1_000_000, err = null as unknown, onConfirm = async () => {} } = {}) {
  const calls: string[] = [];
  return {
    calls,
    getBalance: async () => { calls.push('getBalance'); return balance; },
    sendRawTransaction: async () => { calls.push('send'); return 'sig1'; },
    confirmTransaction: async (strategy: { blockhash: string; lastValidBlockHeight: number }) => {
      calls.push(`confirm:${strategy.blockhash}:${strategy.lastValidBlockHeight}`);
      await onConfirm();
      return { context: { slot: 1 }, value: { err } };
    },
  };
}

const auth = { walletAddress: wallet.publicKey.toBase58(), signTransaction: async (t: Transaction) => { t.sign(wallet); return t; } };

test('signs, sends and confirms with the signed blockhash; reports status', async () => {
  const conn = fakeConnection();
  const statuses: string[] = [];
  const result = await sendAndConfirm(tx(), auth, { prepared, connection: conn as never, onStatus: (s) => statuses.push(s) });
  assert.deepEqual(result, { signature: 'sig1', fee: 5_000, rent: 0 });
  assert.deepEqual(conn.calls, ['getBalance', 'send', `confirm:${prepared.blockhash}:100`]);
  assert.deepEqual(statuses, ['Confirm in your wallet…', 'Waiting for confirmation…']);
});

test('throws TxFailedError when the confirmed transaction has value.err (B3)', async () => {
  const conn = fakeConnection({ err: { InstructionError: [0, { Custom: 6001 }] } });
  await assert.rejects(sendAndConfirm(tx(), auth, { prepared, connection: conn as never }), (e) => e instanceof TxFailedError && e.signature === 'sig1');
});

test('stops before signing when SOL does not cover fee + rent', async () => {
  const conn = fakeConnection({ balance: 4_999 });
  let signed = false;
  await assert.rejects(
    sendAndConfirm(tx(), { ...auth, signTransaction: async (t) => { signed = true; return t; } }, { prepared, connection: conn as never }),
    UserFacingError
  );
  assert.equal(signed, false);
});

test('blocks a second send from the same wallet until the first settles', async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  const conn = fakeConnection({ onConfirm: () => gate });
  const first = sendAndConfirm(tx(), auth, { prepared, connection: conn as never });
  await new Promise((r) => setTimeout(r, 0));
  await assert.rejects(sendAndConfirm(tx(), auth, { prepared, connection: conn as never }), /still in progress/);
  release();
  await first;
  await sendAndConfirm(tx(), auth, { prepared, connection: conn as never });
});
