// Invite link on the phone app (build-plan B4b, C1 router rule): …/c/<fund>#k=<key>.
// routeInvite() decides the destination FIRST; only on the final host is the key imported and the fragment cleared.
// The key never goes into logs, notifications or error messages.
import AsyncStorage from '@react-native-async-storage/async-storage';

export type InviteRoute = { kind: 'here' } | { kind: 'redirect'; url: string };

/**
 * Where an invite opened in this build belongs. This is the mobile build (GitHub Pages / the app), so it is always
 * handled here. TODO(C1): when this code also runs on the Workspace host, narrow screens redirect to
 * MOBILE_ORIGIN + '/c/' + fund + hash (keeping #k=) and wide screens go to the Workspace's own /c/:fund route.
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
