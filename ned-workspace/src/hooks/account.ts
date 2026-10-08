// D30 account (roles, country, business, agreement). The Workspace reads the record the phone app writes: the wallet
// extension at /wallet runs on this origin, so its zustand store "@ned_account_v1" is in this localStorage (the same
// way as hooks/consent.ts). The Workspace never writes it: the user sets up the account in the wallet panel at /role.
// Behind FEATURES.accountRoles; with the flag off every caller sees today's region rule (capabilitiesFor).
import { useMemo, useSyncExternalStore } from 'react';
import type { AccountProfile, AgreementRecord } from '@ned/core/account/types.ts';
import { capabilitiesFor, validateProfile, type Capabilities } from '@ned/core/account/rules.ts';
import { consentVersion, currentAgreement } from '@ned/core/legal/agreement.ts';
import { BUSINESS_COPY } from '@ned/core/account/copy.ts';
import { FEATURES } from '../config.ts';
import { useRegion } from './region.ts';

export const ACCOUNT_STORAGE_KEY = '@ned_account_v1';

interface StoredAccounts {
  profiles: Record<string, AccountProfile>;
  agreements: Record<string, AgreementRecord[]>;
}

function rawAccounts(): string | null {
  try {
    return localStorage.getItem(ACCOUNT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): StoredAccounts {
  try {
    const state = raw ? (JSON.parse(raw) as { state?: Partial<StoredAccounts> }).state : undefined;
    return { profiles: state?.profiles ?? {}, agreements: state?.agreements ?? {} };
  } catch {
    return { profiles: {}, agreements: {} };
  }
}

/** The saved profile and the current agreement of a wallet (not a hook: ensureAccount() reads it at click time) */
export function readAccount(wallet: string | null | undefined): { profile: AccountProfile | null; agreement: AgreementRecord | null } {
  if (!wallet) return { profile: null, agreement: null };
  const all = parse(rawAccounts());
  return { profile: all.profiles[wallet] ?? null, agreement: currentAgreement(all.agreements[wallet], consentVersion(true)) };
}

/** True when the flag is on and the wallet has no complete profile or no current agreement */
export function accountNeedsSetup(wallet: string | null | undefined, accountRoles = FEATURES.accountRoles): boolean {
  if (!accountRoles || !wallet) return false;
  const { profile, agreement } = readAccount(wallet);
  return !profile || validateProfile(profile).length > 0 || !agreement;
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
if (typeof window !== 'undefined') {
  // The panel's app is another document on this origin: its write arrives as a storage event
  window.addEventListener('storage', (e) => {
    if (e.key === ACCOUNT_STORAGE_KEY || e.key === null) notify();
  });
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  // Fallback for browsers that do not fire storage events into iframes' parent in some cases (as hooks/consent.ts)
  const timer = setInterval(l, 3_000);
  return () => {
    listeners.delete(l);
    clearInterval(timer);
  };
};

export interface AccountView {
  profile: AccountProfile | null;
  agreement: AgreementRecord | null;
  capabilities: Capabilities;
  /** Flag on and no complete profile or no current agreement: show AccountPrompt */
  needsSetup: boolean;
  /** The wallet used N.E.D before D30 (it has a money view saved): the prompt shows the update copy */
  isUpdate: boolean;
}

export function useAccount(wallet: string | null | undefined, accountRoles = FEATURES.accountRoles): AccountView {
  const raw = useSyncExternalStore(subscribe, rawAccounts, () => null);
  const { region, chosen } = useRegion(wallet ?? null);
  return useMemo(() => {
    const all = parse(raw);
    const profile = wallet ? all.profiles[wallet] ?? null : null;
    const agreement = wallet ? currentAgreement(all.agreements[wallet], consentVersion(true)) : null;
    const needsSetup = accountRoles && Boolean(wallet) && (!profile || validateProfile(profile).length > 0 || !agreement);
    return {
      profile,
      agreement,
      capabilities: capabilitiesFor(accountRoles, profile, chosen ? region : null),
      needsSetup,
      isUpdate: needsSetup && chosen,
    };
  }, [raw, wallet, accountRoles, region, chosen]);
}

/**
 * "Lumen Studio · Business · self-declared" for the signed-in wallet's own business (badge.business), or null. Phase 1:
 * the details live on this device only, so this shows on the user's own cards and contracts, never on other people's.
 */
export function useOwnBusinessLabel(wallet: string | null | undefined, accountRoles = FEATURES.accountRoles): string | null {
  const { profile } = useAccount(wallet, accountRoles);
  if (!accountRoles || profile?.client?.kind !== 'business' || !profile.business) return null;
  return `${profile.business.name} · ${BUSINESS_COPY.badge}`;
}
