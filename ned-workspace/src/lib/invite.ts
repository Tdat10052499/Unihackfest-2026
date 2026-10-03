// Where an invite link (/c/:fund#k=…) goes (workspace-plan W2). Pure, so the order of the checks is tested:
// the phone check comes first and never touches the fragment.
export const PHONE_MAX_WIDTH = 900;

export type InviteDecision =
  | { kind: 'phone'; url: string }
  | { kind: 'wait' }
  | { kind: 'import'; fragment: string; then: string }
  | { kind: 'signIn'; fragment: string }
  | { kind: 'invalid' };

export function decideInvite(p: {
  fund: string;
  validFund: boolean;
  width: number;
  hash: string;
  mobileOrigin: string;
  auth: 'initializing' | 'setting-up' | 'ready' | 'signed-out' | 'error' | 'unconfigured';
  signedIn: boolean;
}): InviteDecision {
  if (!p.validFund) return { kind: 'invalid' };
  if (p.width < PHONE_MAX_WIDTH) return { kind: 'phone', url: `${p.mobileOrigin}/c/${p.fund}${p.hash}` };
  if (p.auth === 'initializing' || p.auth === 'setting-up') return { kind: 'wait' };
  if (p.auth === 'ready' && p.signedIn) return { kind: 'import', fragment: p.hash, then: `/contract/${p.fund}` };
  return { kind: 'signIn', fragment: p.hash };
}
