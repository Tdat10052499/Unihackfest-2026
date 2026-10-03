// Re-export shim (workspace-plan W0): the code lives in packages/ned-core. Keeps old import paths working.
import '../services/coreInit.ts';
import { getProgramId } from '@ned/core/config.ts';

export * from '@ned/core/constants.ts';
/** Program ID after configureCore (IDL address or EXPO_PUBLIC_ANCHOR_PROGRAM_ID) */
export const PROGRAM_ID = getProgramId();
