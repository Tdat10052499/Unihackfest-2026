import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateFee, calculateMinimumReceived, DEVNET_USDC_MINT, MAINNET_USDC_MINT, mapDevnetMintToMainnet } from '../core.ts';

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
