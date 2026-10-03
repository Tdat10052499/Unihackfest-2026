// Contract keys on this computer (build-plan B1): localStorage, one entry per wallet (`@ned_contract_keys_v1:<wallet>`),
// the same layout as the phone's AsyncStorage. The key never leaves the device except in the invite link: never log
// it, never put it in an error, a URL other than the invite link, or analytics.
import type { KeyStorage } from '@ned/core/milestone/keys.ts';

export const contractKeyStorage: KeyStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // storage blocked (private window): the key lives only in the invite link
    }
  },
};

/**
 * An invite opened before sign-in waits here for the wallet (the Google redirect keeps sessionStorage in this tab).
 * Only the fund and the fragment text are kept, and only until the next sign-in in this tab.
 */
const PENDING = 'ned.pendingInvite';
export function stashPendingInvite(fund: string, fragment: string): void {
  try {
    sessionStorage.setItem(PENDING, JSON.stringify({ fund, fragment }));
  } catch {
    // no session storage: the user opens the link again after signing in
  }
}
export function takePendingInvite(): { fund: string; fragment: string } | null {
  try {
    const raw = sessionStorage.getItem(PENDING);
    sessionStorage.removeItem(PENDING);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v.fund === 'string' && typeof v.fragment === 'string' ? v : null;
  } catch {
    return null;
  }
}

/** True while an invite waits for sign-in (the sign-in route then lets PendingInvite navigate) */
export function hasPendingInvite(): boolean {
  try {
    return sessionStorage.getItem(PENDING) !== null;
  } catch {
    return false;
  }
}
