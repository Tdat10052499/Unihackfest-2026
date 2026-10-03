// Runtime configuration of @ned/core (workspace-plan section 1). The core reads no process.env / import.meta.env:
// each app calls configureCore() once at start-up with its own env values. Getters are read at call time.
import { PublicKey, type Connection } from '@solana/web3.js';
import { createConnection, PUBLIC_DEVNET_RPC } from './chain/connection.ts';
import { IDL_PROGRAM_ID } from './constants.ts';

export const DEFAULT_MOBILE_ORIGIN = 'https://tdat10052499.github.io/Unihackfest-2026';
/** Production Workspace (Vercel, W1); its /c/:fund router sends phones on to the mobile origin (W2) */
export const DEFAULT_WORKSPACE_ORIGIN = 'https://unihackfest-2026.vercel.app';

export interface CoreConfig {
  /** Devnet RPC URL (Helius or public) */
  rpcUrl: string;
  /** Override of the IDL program address (base58); an invalid value falls back to the IDL address */
  programId?: string | PublicKey;
  /** Origin of the Workspace web app (Vercel); '' turns the Workspace hop off (links use the mobile origin) */
  workspaceOrigin?: string;
  /** Origin of the mobile web build (GitHub Pages) */
  mobileOrigin?: string;
}

let rpcUrl = PUBLIC_DEVNET_RPC;
let programId = IDL_PROGRAM_ID;
let workspaceOrigin = '';
let mobileOrigin = DEFAULT_MOBILE_ORIGIN;
let connection: Connection | null = null;

function resolveProgramId(value: string | PublicKey | undefined): PublicKey {
  if (value instanceof PublicKey) return value;
  const override = value?.trim();
  if (override) {
    try {
      return new PublicKey(override);
    } catch {
      console.warn(`[chain] program ID override "${override}" is not a valid address; using the IDL address.`);
    }
  }
  return IDL_PROGRAM_ID;
}

export function configureCore(config: CoreConfig): void {
  if (config.rpcUrl && config.rpcUrl !== rpcUrl) {
    rpcUrl = config.rpcUrl;
    connection = null;
  }
  programId = resolveProgramId(config.programId);
  workspaceOrigin = (config.workspaceOrigin ?? '').replace(/\/+$/, '');
  mobileOrigin = (config.mobileOrigin || DEFAULT_MOBILE_ORIGIN).replace(/\/+$/, '');
}

export const getRpcUrl = () => rpcUrl;
export const getProgramId = () => programId;
export const getWorkspaceOrigin = () => workspaceOrigin;
export const getMobileOrigin = () => mobileOrigin;

/** The one devnet Connection for this app (created on first use from the configured URL) */
export function getConnection(): Connection {
  connection ??= createConnection(rpcUrl);
  return connection;
}
