// The only place that defines cluster, program, mint and rate constants (docs/09-milestone-lock/non-ui-plan.md N0).
// Import from here; never repeat these addresses in another file. No env reads: runtime values come from
// configureCore (config.ts).
import { PublicKey } from '@solana/web3.js';
import idl from './idl/ned_program.json' with { type: 'json' };

/** This build signs on devnet only (B7). */
export const CLUSTER = 'devnet' as const;

/** Program address in the bundled IDL; configureCore({ programId }) may override it (see getProgramId) */
export const IDL_PROGRAM_ID = new PublicKey(idl.address);

/** Circle devnet USDC, 6 decimals. Equals USDC_MINT in ned_program. */
export const USDC_DEVNET_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
export const USDC_DECIMALS = 6;

export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
export const ATA_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

/**
 * Team-controlled devnet wallet that simulates the payout partner; must equal PAYOUT_PARTNERS in ned_program.
 * Keypair: ~/.config/solana/ned-demo-partner.json (outside the repo). scripts/recycle-demo-usdc.ts sends the
 * USDC it receives back to the client for the next demo run.
 */
export const DEMO_PAYOUT_PARTNER = new PublicKey('FA2qzovJShkNNNnMz3nXmYXvBzenRTgU2oko7RBBhbyp');

/** Fixed demo rate for "≈ … VND (estimate)" (Wise mid-market, 2 Oct 2026). Update on demo day. */
export const USD_VND_RATE = 26_019.5;
export const USD_VND_RATE_DATE = '2026-10-02';
