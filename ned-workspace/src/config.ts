// Start-up configuration (workspace-plan section 1): @ned/core reads no env, so the app passes its VITE_* values.
import { PUBLIC_DEVNET_RPC } from '@ned/core/chain/connection.ts';
import { configureCore, DEFAULT_MOBILE_ORIGIN, DEFAULT_WORKSPACE_ORIGIN } from '@ned/core/config.ts';

export const env = {
  dynamicEnvironmentId: import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID ?? '',
  mobileOrigin: (import.meta.env.VITE_MOBILE_ORIGIN || DEFAULT_MOBILE_ORIGIN).replace(/\/+$/, ''),
  // Invite links made here point at the production Workspace router (W2), also from previews and localhost
  workspaceOrigin: (import.meta.env.VITE_WORKSPACE_ORIGIN || DEFAULT_WORKSPACE_ORIGIN).replace(/\/+$/, ''),
};

/**
 * Feature flags. `jobs` (D25/D28, the N.E.D Jobs site under /jobs): on by default; VITE_FEATURE_JOBS=false turns it
 * off, and /jobs/* then redirects to the Workspace.
 */
export const FEATURES = {
  jobs: import.meta.env.VITE_FEATURE_JOBS !== 'false',
  /**
   * The dispute group of D27 (request changes, revised version, split, return to client, final files): on by default
   * (review-decision-plan.md); VITE_FEATURE_DISPUTE=false turns every D27 control off.
   */
  dispute: import.meta.env.VITE_FEATURE_DISPUTE !== 'false',
} as const;

configureCore({
  rpcUrl: import.meta.env.VITE_HELIUS_DEVNET_URL || PUBLIC_DEVNET_RPC,
  programId: import.meta.env.VITE_PROGRAM_ID,
  mobileOrigin: env.mobileOrigin,
  workspaceOrigin: env.workspaceOrigin,
});
