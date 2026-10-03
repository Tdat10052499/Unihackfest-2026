// Invite link on the phone app (build-plan B4b; C1 router rule lives in ned-workspace, W2): …/c/<fund>#k=<key>.
// routeInvite() decides the destination FIRST; only on the final host is the key imported and the fragment cleared.
// The key never goes into logs, notifications or error messages.
import AsyncStorage from '@react-native-async-storage/async-storage';

export type InviteRoute = { kind: 'here' } | { kind: 'redirect'; url: string };

/**
 * Where an invite opened in this build belongs: always here. The device split (D16) happens before this, on the
 * Workspace host: ned-workspace's /c/:fund sends narrow screens to MOBILE_ORIGIN/c/<fund>#k=… and keeps wide ones
 * (workspace-plan W2, C1 closed by D20). This build is the mobile one and is never served on the Workspace host.
 * Kept as a function so the order stays explicit: decide first, then import the key and clear the fragment.
 */
export function routeInvite(_p: { fund: string; hash: string; width: number; host: string }): InviteRoute {
  return { kind: 'here' };
}

/** The fragment part of a link or location hash ("#k=…"), or '' */
export function fragmentOf(urlOrHash: string | null | undefined): string {
  const s = String(urlOrHash ?? '');
  const i = s.indexOf('#');
  return i >= 0 ? s.slice(i) : '';
}

// An invite opened before sign-in waits here until the wallet exists (then PendingInviteGate imports it).
const PENDING = '@ned_pending_invite_v1';
export async function stashInvite(fund: string, fragment: string): Promise<void> {
  await AsyncStorage.setItem(PENDING, JSON.stringify({ fund, fragment, at: Date.now() }));
}
export async function takeInvite(): Promise<{ fund: string; fragment: string } | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING);
    if (!raw) return null;
    await AsyncStorage.removeItem(PENDING);
    const v = JSON.parse(raw);
    // A pending invite is only kept for a day
    if (typeof v?.fund !== 'string' || typeof v?.fragment !== 'string' || Date.now() - Number(v.at) > 86_400_000) return null;
    return { fund: v.fund, fragment: v.fragment };
  } catch {
    return null;
  }
}
