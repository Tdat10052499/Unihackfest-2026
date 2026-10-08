// D30 account per wallet, on this device only (roles-and-agreement-build.md §2, D30 prompts section 0 rule 6): the role,
// country and business details, and an append-only log of the N.E.D Agreement. Nothing here goes on-chain, into a URL or
// to a third party. Sign-out clears the profiles and keeps the log (services/storage.ts, signOutKeys.ts).
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AccountProfile, AgreementRecord } from '@ned/core/account/types.ts';
import { consentVersion } from '@ned/core/legal/agreement.ts';
import { currentAgreement } from '../services/accountOnboarding';
import { FEATURES } from '../constants/features';

export const ACCOUNT_STORAGE_KEY = '@ned_account_v1';

interface AccountState {
  /** wallet address → profile */
  profiles: Record<string, AccountProfile>;
  /** wallet address → every agreement given, oldest first; withdrawals set withdrawnAt */
  agreements: Record<string, AgreementRecord[]>;
  isHydrated: boolean;
  setProfile: (wallet: string, profile: AccountProfile) => void;
  clearProfile: (wallet: string) => void;
  /** Sign-out: every profile goes, the agreement log stays */
  clearProfiles: () => void;
  acceptAgreement: (wallet: string, record: AgreementRecord) => void;
  /** Marks the current agreement withdrawn (the record is kept) */
  withdrawAgreement: (wallet: string) => void;
  getProfile: (wallet: string | null | undefined) => AccountProfile | null;
  /** The latest record that is not withdrawn, at AGREEMENT_VERSION and the current consent version, or null */
  getAgreement: (wallet: string | null | undefined) => AgreementRecord | null;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      profiles: {},
      agreements: {},
      isHydrated: false,
      setProfile: (wallet, profile) => set({ profiles: { ...get().profiles, [wallet]: profile } }),
      clearProfile: (wallet) => {
        const { [wallet]: _gone, ...rest } = get().profiles;
        set({ profiles: rest });
      },
      clearProfiles: () => set({ profiles: {} }),
      acceptAgreement: (wallet, record) =>
        set({ agreements: { ...get().agreements, [wallet]: [...(get().agreements[wallet] ?? []), record] } }),
      withdrawAgreement: (wallet) => {
        const log = get().agreements[wallet];
        if (!log?.length) return;
        const now = Date.now();
        set({ agreements: { ...get().agreements, [wallet]: log.map((r) => (r.withdrawnAt ? r : { ...r, withdrawnAt: now })) } });
      },
      getProfile: (wallet) => (wallet ? get().profiles[wallet] ?? null : null),
      getAgreement: (wallet) => (wallet ? currentAgreement(get().agreements[wallet], consentVersion(FEATURES.accountRoles)) : null),
    }),
    {
      name: ACCOUNT_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ profiles: state.profiles, agreements: state.agreements }),
      onRehydrateStorage: () => () => {
        useAccountStore.setState({ isHydrated: true });
      },
    }
  )
);

export function waitForAccountHydration(): Promise<void> {
  if (useAccountStore.getState().isHydrated) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useAccountStore.subscribe((state) => {
      if (state.isHydrated) {
        unsubscribe();
        resolve();
      }
    });
  });
}
