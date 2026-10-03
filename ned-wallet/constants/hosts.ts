// Hosts of the two web builds (build-plan B1, decision D16): the mobile build on GitHub Pages and the Workspace on
// Vercel. Values come from EXPO_PUBLIC_MOBILE_ORIGIN / EXPO_PUBLIC_WORKSPACE_ORIGIN through services/coreInit.ts.
// Invite links always point at WORKSPACE_ORIGIN (it sends phones on to MOBILE_ORIGIN); while that is unset they use
// MOBILE_ORIGIN. TODO(C1/W2): isWorkspaceHost().
import '../services/coreInit.ts';
import { getMobileOrigin, getWorkspaceOrigin } from '@ned/core/config.ts';

export const MOBILE_ORIGIN = getMobileOrigin();
export const WORKSPACE_ORIGIN = getWorkspaceOrigin();
