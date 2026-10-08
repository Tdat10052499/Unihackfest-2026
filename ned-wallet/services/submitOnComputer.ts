// F-1 (CL pre-pitch-check 7 Oct): the phone app cannot pick local files, so it cannot list the final files a delivery
// needs (validateDelivery, F1). The Submit screen says so, keeps the slide off and opens the same milestone on the
// Workspace. Pure, so the node tests can check it.
import { DEFAULT_WORKSPACE_ORIGIN } from '@ned/core/config.ts';

export const SUBMIT_ON_COMPUTER = 'Submit from the Workspace on a computer to list your final files.';

/** The Workspace Submit page of the same milestone: /contract/<fund>/submit?i=<index> */
export function workspaceSubmitUrl(origin: string | undefined, fund: string, index: number): string {
  const base = (origin || DEFAULT_WORKSPACE_ORIGIN).replace(/\/+$/, '');
  return `${base}/contract/${fund}/submit?i=${index}`;
}

/** True while the only thing missing is the final-file list (field "finals"): the phone cannot fix that */
export const needsComputerForFinals = (problems: readonly { field: string }[]): boolean => problems.some((p) => p.field === 'finals');
