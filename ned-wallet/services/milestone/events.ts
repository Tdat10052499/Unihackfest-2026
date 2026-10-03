// Re-export shim (workspace-plan W0): the code lives in packages/ned-core. Keeps old import paths working.
import '../../services/coreInit.ts';
export * from '@ned/core/milestone/events.ts';
