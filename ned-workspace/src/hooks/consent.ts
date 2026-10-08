// Consent (compliance fix P4, Decree 356/2025 Art. 6). The Workspace reads the record the phone app writes: the
// wallet extension at /wallet runs on this origin, so its zustand store "@ned_consent_v1" is in this localStorage.
// A valid consent is not withdrawn and has the current version (ned-wallet/stores/useConsentStore.ts). The Workspace
// never writes it: the user agrees in the wallet panel at /consent.
import { useSyncExternalStore } from 'react';
import { consentVersion } from '@ned/core/legal/agreement.ts';
import { FEATURES } from '../config.ts';

export const CONSENT_STORAGE_KEY = '@ned_consent_v1';
/** Same source as CONSENT_VERSION in ned-wallet/stores/useConsentStore.ts (core consentVersion) */
export const CONSENT_VERSION = consentVersion(FEATURES.accountRoles);

interface ConsentRecord {
  acceptedAt: number;
  scope: string[];
  version: number;
  withdrawnAt?: number;
}

export function hasConsent(wallet: string | null | undefined): boolean {
  if (!wallet) return false;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    const record = raw ? ((JSON.parse(raw) as { state?: { consents?: Record<string, ConsentRecord> } }).state?.consents?.[wallet] ?? null) : null;
    // Read the flag at call time (tests switch it); equals CONSENT_VERSION in the app
    return Boolean(record && !record.withdrawnAt && record.version === consentVersion(FEATURES.accountRoles));
  } catch {
    return false;
  }
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
if (typeof window !== 'undefined') {
  // The panel's app is another document on this origin: its write arrives as a storage event
  window.addEventListener('storage', (e) => {
    if (e.key === CONSENT_STORAGE_KEY || e.key === null) notify();
  });
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  // Fallback for browsers that do not fire storage events into iframes' parent in some cases
  const timer = setInterval(l, 3_000);
  return () => {
    listeners.delete(l);
    clearInterval(timer);
  };
};

export function useConsent(wallet: string | null | undefined): boolean {
  return useSyncExternalStore(subscribe, () => hasConsent(wallet), () => false);
}

/** Banner text of the consent gate (S9) */
export const CONSENT_NEEDED = 'Before you create contracts, post jobs or apply, agree to how N.E.D uses your data. It takes a minute in your wallet.';
