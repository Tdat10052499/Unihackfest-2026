// Re-export shim (workspace-plan W0): the code lives in packages/ned-core. Keeps old import paths working.
import '../../services/coreInit.ts';
import { getConnection, getRpcUrl } from '@ned/core/config.ts';

export { createConnection, PUBLIC_DEVNET_RPC } from '@ned/core/chain/connection.ts';
/** The configured devnet RPC URL */
export const DEVNET_RPC_URL = getRpcUrl();
/** The one devnet Connection of this app */
export const connection = getConnection();
