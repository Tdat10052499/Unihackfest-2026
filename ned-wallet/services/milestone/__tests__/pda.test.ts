import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey } from '@solana/web3.js';
import { fundPda, vaultPda } from '../pda.ts';

test('fund and vault PDAs match the vector printed by the program test (tests/milestone.rs pda_vector_for_the_app)', () => {
  const fund = fundPda(new PublicKey('FSyUz7Kfy58vDosLPMqtVYzbcsCfCyrPiDWc65kY6QuQ'), 1_759_400_000_123n);
  assert.equal(fund.toBase58(), '2rM8YfeiMG6oXCRxfgFXWgR91sfVxa5ekmrq5TzXWRcM');
  assert.equal(vaultPda(fund).toBase58(), 'CpznorLKcrdrGqi8wtvpXv1oPpgZqE8uNXyzGe7u2PsC');
});
