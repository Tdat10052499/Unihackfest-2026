// Hosts of the two web builds (build-plan B1, decision D16): the mobile build on GitHub Pages and the Workspace on
// Vercel. Values come from EXPO_PUBLIC_MOBILE_ORIGIN / EXPO_PUBLIC_WORKSPACE_ORIGIN through services/coreInit.ts.
// Invite links always point at WORKSPACE_ORIGIN (default: the production Workspace). Its /c/:fund router
// (ned-workspace, W2) sends screens under 900 px on to MOBILE_ORIGIN with #k= kept, so this build never runs on the
// Workspace host and needs no isWorkspaceHost() (C1 closed, D20).
import '../services/coreInit.ts';
import { getMobileOrigin, getWorkspaceOrigin } from '@ned/core/config.ts';

export const MOBILE_ORIGIN = getMobileOrigin();
export const WORKSPACE_ORIGIN = getWorkspaceOrigin();
