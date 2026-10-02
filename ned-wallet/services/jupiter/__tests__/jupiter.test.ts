import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey } from '@solana/web3.js';
import { calculateFee, calculateMinimumReceived, DEVNET_USDC_MINT, MAINNET_USDC_MINT, mapDevnetMintToMainnet } from '../fees.ts';

// Fixture: Circle's published mainnet USDC mint, written out here so a typo in constants/chain.ts fails the test (B2).
const CIRCLE_MAINNET_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

test('mainnet USDC mint is the Circle address and a valid public key', () => {
  assert.equal(MAINNET_USDC_MINT, CIRCLE_MAINNET_USDC);
  assert.equal(new PublicKey(MAINNET_USDC_MINT).toBytes().length, 32);
});

test('devnet balances map to mainnet quote mints', () => {
  assert.equal(mapDevnetMintToMainnet(DEVNET_USDC_MINT), MAINNET_USDC_MINT);
  assert.equal(mapDevnetMintToMainnet('SOL'), 'So11111111111111111111111111111111111111112');
  assert.equal(mapDevnetMintToMainnet('unknown'), null);
});

test('N.E.D fee is 25 bps and minimum received is net of fee', () => {
  assert.equal(calculateFee(1_000_000n), 2_500n);
  const order = { otherAmountThreshold: '990000' };
  assert.equal(calculateMinimumReceived(order), 987525n);
});
