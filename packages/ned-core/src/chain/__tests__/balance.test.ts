import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, PublicKey, type AccountInfo } from '@solana/web3.js';
import { fetchUsdcUnits, tokenAmountFromAccountData, usdcNumberFromUnits } from '../balance.ts';
import { ata } from '../ata.ts';
import { TOKEN_PROGRAM_ID, USDC_DEVNET_MINT } from '../../constants.ts';

/** Raw 165-byte SPL token account: mint · owner · amount (u64 LE at 64). */
function tokenAccount(mint: PublicKey, owner: PublicKey, amount: bigint): AccountInfo<Buffer> {
  const data = Buffer.alloc(165);
  mint.toBuffer().copy(data, 0);
  owner.toBuffer().copy(data, 32);
  data.writeBigUInt64LE(amount, 64);
  return { data, owner: TOKEN_PROGRAM_ID, lamports: 2_039_280, executable: false, rentEpoch: 0 };
}

/** Fake connection holding the given accounts; only getAccountInfo exists, so any other RPC call would throw. */
function fakeConnection(accounts: Map<string, AccountInfo<Buffer>>) {
  const reads: string[] = [];
  return {
    reads,
    getAccountInfo: async (key: PublicKey) => {
      reads.push(key.toBase58());
      return accounts.get(key.toBase58()) ?? null;
    },
  };
}

test('B1: empty USDC ATA + another token → 0', async () => {
  const owner = Keypair.generate().publicKey;
  const otherMint = Keypair.generate().publicKey;
  const usdcAta = ata(USDC_DEVNET_MINT, owner);
  const conn = fakeConnection(new Map([
    [usdcAta.toBase58(), tokenAccount(USDC_DEVNET_MINT, owner, 0n)],
    [ata(otherMint, owner).toBase58(), tokenAccount(otherMint, owner, 50_000_000n)],
  ]));
  assert.equal(await fetchUsdcUnits(conn as never, owner), 0n);
  assert.deepEqual(conn.reads, [usdcAta.toBase58()]);
});

test('missing USDC ATA + another token → 0', async () => {
  const owner = Keypair.generate().publicKey;
  const otherMint = Keypair.generate().publicKey;
  const conn = fakeConnection(new Map([[ata(otherMint, owner).toBase58(), tokenAccount(otherMint, owner, 7_000_000n)]]));
  assert.equal(await fetchUsdcUnits(conn as never, owner), 0n);
});

test('USDC ATA amount is read in integer base units', async () => {
  const owner = Keypair.generate().publicKey;
  const conn = fakeConnection(new Map([[ata(USDC_DEVNET_MINT, owner).toBase58(), tokenAccount(USDC_DEVNET_MINT, owner, 18_123_456n)]]));
  assert.equal(await fetchUsdcUnits(conn as never, owner), 18_123_456n);
});

test('base units → display number', () => {
  assert.equal(usdcNumberFromUnits(0n), 0);
  assert.equal(usdcNumberFromUnits(1n), 0.000001);
  assert.equal(usdcNumberFromUnits(18_123_456n), 18.123456);
  assert.equal(usdcNumberFromUnits(1_000_000_000n), 1000);
  assert.equal(tokenAmountFromAccountData(null), 0n);
  assert.equal(tokenAmountFromAccountData(new Uint8Array(10)), 0n);
});
