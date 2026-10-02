// One devnet Connection for the whole app (non-ui-plan N0.3).
import { Connection } from '@solana/web3.js';

export const PUBLIC_DEVNET_RPC = 'https://api.devnet.solana.com';

/** Env order: EXPO_PUBLIC_HELIUS_DEVNET_URL → EXPO_PUBLIC_SOLANA_DEVNET_RPC → public devnet. */
export const DEVNET_RPC_URL: string =
  process.env.EXPO_PUBLIC_HELIUS_DEVNET_URL ||
  process.env.EXPO_PUBLIC_SOLANA_DEVNET_RPC ||
  PUBLIC_DEVNET_RPC;

export const connection = new Connection(DEVNET_RPC_URL, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 30_000,
});
