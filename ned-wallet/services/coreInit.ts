// Configures @ned/core from this app's EXPO_PUBLIC_* values (workspace-plan W0). Imported first by app/_layout.tsx
// and by every re-export shim, so the core is configured before any module reads the program ID or connection.
import { configureCore, DEFAULT_MOBILE_ORIGIN, PUBLIC_DEVNET_RPC } from '@ned/core/index.ts';

configureCore({
  // Env order (unchanged from N0): EXPO_PUBLIC_HELIUS_DEVNET_URL → EXPO_PUBLIC_SOLANA_DEVNET_RPC → public devnet
  rpcUrl: process.env.EXPO_PUBLIC_HELIUS_DEVNET_URL || process.env.EXPO_PUBLIC_SOLANA_DEVNET_RPC || PUBLIC_DEVNET_RPC,
  programId: process.env.EXPO_PUBLIC_ANCHOR_PROGRAM_ID,
  workspaceOrigin: process.env.EXPO_PUBLIC_WORKSPACE_ORIGIN ?? '',
  mobileOrigin: process.env.EXPO_PUBLIC_MOBILE_ORIGIN || DEFAULT_MOBILE_ORIGIN,
});
