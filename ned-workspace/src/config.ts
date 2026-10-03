// Start-up configuration (workspace-plan section 1): @ned/core reads no env, so the app passes its VITE_* values.
import { PUBLIC_DEVNET_RPC } from '@ned/core/chain/connection.ts';
import { configureCore, DEFAULT_MOBILE_ORIGIN } from '@ned/core/config.ts';

export const env = {
  dynamicEnvironmentId: import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID ?? '',
  mobileOrigin: (import.meta.env.VITE_MOBILE_ORIGIN || DEFAULT_MOBILE_ORIGIN).replace(/\/+$/, ''),
  workspaceOrigin: (import.meta.env.VITE_WORKSPACE_ORIGIN ?? '').replace(/\/+$/, ''),
};

configureCore({
  rpcUrl: import.meta.env.VITE_HELIUS_DEVNET_URL || PUBLIC_DEVNET_RPC,
  programId: import.meta.env.VITE_PROGRAM_ID,
  mobileOrigin: env.mobileOrigin,
  workspaceOrigin: env.workspaceOrigin,
});
