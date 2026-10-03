// Devnet Connection factory (non-ui-plan N0.3). The URL comes from configureCore (config.ts); each app passes its
// own env value (Expo: EXPO_PUBLIC_HELIUS_DEVNET_URL → EXPO_PUBLIC_SOLANA_DEVNET_RPC → public devnet).
import { Connection } from '@solana/web3.js';

export const PUBLIC_DEVNET_RPC = 'https://api.devnet.solana.com';

export function createConnection(rpcUrl: string): Connection {
  return new Connection(rpcUrl, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 30_000,
  });
}
