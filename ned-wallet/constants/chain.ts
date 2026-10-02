// The only place that defines cluster, program, mint and rate constants (docs/09-milestone-lock/non-ui-plan.md N0).
// Import from here; never repeat these addresses in another file.
import { PublicKey } from '@solana/web3.js';
import idl from '../idl/ned_program.json' with { type: 'json' };

/** This build signs on devnet only (B7). */
export const CLUSTER = 'devnet' as const;

function resolveProgramId(): PublicKey {
  const override = process.env.EXPO_PUBLIC_ANCHOR_PROGRAM_ID?.trim();
  if (override) {
    try {
      return new PublicKey(override);
    } catch {
      console.warn(`[chain] EXPO_PUBLIC_ANCHOR_PROGRAM_ID "${override}" is not a valid address; using the IDL address.`);
    }
  }
  return new PublicKey(idl.address);
}

/** ned_program: the IDL address, overridable by EXPO_PUBLIC_ANCHOR_PROGRAM_ID. */
export const PROGRAM_ID = resolveProgramId();

/** Circle devnet USDC, 6 decimals. Equals USDC_MINT in ned_program. */
export const USDC_DEVNET_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
/** Circle mainnet USDC. Used only for Jupiter price quotes (read-only). */
export const USDC_MAINNET_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
export const USDC_DECIMALS = 6;

export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
export const ATA_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

/**
 * Team-controlled devnet wallet that simulates the payout partner; must equal PAYOUT_PARTNERS in ned_program
 * (deployed in N6/N7). TODO(N12): replace both with the public key of ~/.config/solana/ned-demo-partner.json;
 * this placeholder has no saved private key, so USDC sent to it cannot be recycled.
 */
export const DEMO_PAYOUT_PARTNER = new PublicKey('DwjFswK4mFycQgV2pckFWYj8T2jTWc4RWgBNgDcbZYjt');

/** Fixed demo rate for "≈ … VND (estimate)" (Wise mid-market, 2 Oct 2026). Update on demo day. */
export const USD_VND_RATE = 26_019.5;
export const USD_VND_RATE_DATE = '2026-10-02';
