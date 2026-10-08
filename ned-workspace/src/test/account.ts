// D30 test helpers: the phone app's account and consent records in localStorage, the flag, and a signed-in wallet.
import type { AccountProfile } from '@ned/core/account/types.ts';
import { agreementHash, agreementText, AGREEMENT_VERSION } from '@ned/core/legal/agreement.ts';
import { FEATURES } from '../config.ts';
import type { AuthContextValue } from '../auth/AuthProvider.tsx';

export const WALLET = '9PZwK7pZmZnqfq1D5Xm9JvmoFQbPSjCoxj4AHiVLrhkW';

export const PROFILES: Record<'freelancer' | 'client' | 'vn' | 'business', AccountProfile> = {
  freelancer: { version: 1, freelancer: true, client: null, country: 'SG', updatedAt: 1 },
  client: { version: 1, freelancer: false, client: { kind: 'individual' }, country: 'SG', updatedAt: 1 },
  vn: { version: 1, freelancer: true, client: null, country: 'VN', updatedAt: 1 },
  business: {
    version: 1,
    freelancer: false,
    client: { kind: 'business' },
    country: 'SG',
    business: { name: 'Lumen Studio', registeredIn: 'SG', size: '2-10', industry: 0 },
    updatedAt: 1,
  },
};

/** Writes what the wallet writes on "Agree and continue": profile + agreement, consent v3, region */
export function seedAccount(profile: AccountProfile | null, wallet = WALLET) {
  if (!profile) {
    localStorage.removeItem('@ned_account_v1');
    return;
  }
  const record = {
    agreementVersion: AGREEMENT_VERSION,
    consentVersion: 3,
    roles: { freelancer: profile.freelancer, client: profile.client?.kind ?? null },
    country: profile.country,
    acceptedAt: 1,
    textSha256: agreementHash(agreementText(profile)),
  };
  localStorage.setItem('@ned_account_v1', JSON.stringify({ state: { profiles: { [wallet]: profile }, agreements: { [wallet]: [record] } }, version: 0 }));
  localStorage.setItem('@ned_consent_v1', JSON.stringify({ state: { consents: { [wallet]: { acceptedAt: 1, scope: [], version: 3 } } }, version: 0 }));
  localStorage.setItem('@ned_region_v1', JSON.stringify({ state: { regions: { [wallet]: profile.country === 'VN' ? 'vn' : 'intl' } }, version: 0 }));
}

const flags = FEATURES as { accountRoles: boolean };
const initial = flags.accountRoles;
export const setAccountRoles = (on: boolean) => {
  flags.accountRoles = on;
};
export const resetAccountRoles = () => {
  flags.accountRoles = initial;
};

export const authFor = (wallet: string | null): AuthContextValue =>
  ({
    status: wallet ? 'ready' : 'signed-out',
    walletAddress: wallet,
    email: null,
    error: null,
    login: async () => {},
    logout: async () => {},
    signTransaction: async (t: never) => t,
    signMessage: async () => new Uint8Array(),
  }) as unknown as AuthContextValue;
