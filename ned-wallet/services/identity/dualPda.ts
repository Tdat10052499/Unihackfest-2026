// Re-export shim (workspace-plan W0): the code lives in packages/ned-core. Keeps old import paths working.
import '../../services/coreInit.ts';
import { getProgramId } from '@ned/core/config.ts';

export * from '@ned/core/identity/dualPda.ts';
/** Program ID after configureCore (same program as Milestone Lock) */
export const IDENTITY_PROGRAM_ID = getProgramId();
