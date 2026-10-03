import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { ata, createAtaIdempotentIx } from '../ata.ts';
import { ATA_PROGRAM_ID, TOKEN_PROGRAM_ID, USDC_DEVNET_MINT } from '../../constants.ts';

// Fixture read from devnet on 2 Oct 2026 (getTokenAccountsByOwner, mint = devnet USDC): the owner's USDC token account.
const OWNER = new PublicKey('9PZwK7pZmZnqfq1D5Xm9JvmoFQbPSjCoxj4AHiVLrhkW');
const OWNER_USDC_ATA = 'xxhShY2iMXU2LY4f5sJ2cuQCZqZD4fgUdoPkXGVsjMM';

test('ata() matches the USDC account that exists on devnet', () => {
  assert.equal(ata(USDC_DEVNET_MINT, OWNER).toBase58(), OWNER_USDC_ATA);
});

test('ata() rejects an off-curve owner unless allowed', () => {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('fund')], Keypair.generate().publicKey);
  assert.throws(() => ata(USDC_DEVNET_MINT, pda), /TokenOwnerOffCurveError/);
  assert.ok(ata(USDC_DEVNET_MINT, pda, { allowOwnerOffCurve: true }) instanceof PublicKey);
});

test('createAtaIdempotentIx uses CreateIdempotent ([1]) and the ATA account order', () => {
  const payer = Keypair.generate().publicKey;
  const ix = createAtaIdempotentIx(payer, OWNER, USDC_DEVNET_MINT);
  assert.ok(ix.programId.equals(ATA_PROGRAM_ID));
  assert.deepEqual([...ix.data], [1]);
  assert.deepEqual(ix.keys.map((k) => [k.pubkey.toBase58(), k.isSigner, k.isWritable]), [
    [payer.toBase58(), true, true],
    [OWNER_USDC_ATA, false, true],
    [OWNER.toBase58(), false, false],
    [USDC_DEVNET_MINT.toBase58(), false, false],
    [SystemProgram.programId.toBase58(), false, false],
    [TOKEN_PROGRAM_ID.toBase58(), false, false],
  ]);
});
