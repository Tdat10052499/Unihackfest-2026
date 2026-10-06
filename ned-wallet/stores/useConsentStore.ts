// Nhật ký đồng ý xử lý dữ liệu theo từng ví, lưu trên máy (Decree 356/2025 Art. 6; non-ui-plan N11).
// Ghi lại thời điểm, phạm vi và phiên bản văn bản; rút lại đồng ý giữ bản ghi và đánh dấu withdrawnAt.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CONSENT_STORAGE_KEY = '@ned_consent_v1';
/** Bump when the consent text changes; an older version counts as no consent */
export const CONSENT_VERSION = 2;

export interface ConsentRecord {
  /** unix ms */
  acceptedAt: number;
  /** what the user agreed to, e.g. ['wallet-address', 'username', 'phone-hash'] */
  scope: string[];
  version: number;
  /** unix ms; set by withdraw(), the record is kept as a log */
  withdrawnAt?: number;
}

interface ConsentState {
  consents: Record<string, ConsentRecord>;
  isHydrated: boolean;
  accept: (wallet: string, scope: string[], version?: number) => void;
  withdraw: (wallet: string) => void;
  /** The current, not withdrawn consent at CONSENT_VERSION, or null */
  getConsent: (wallet: string | null | undefined) => ConsentRecord | null;
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set, get) => ({
      consents: {},
      isHydrated: false,
      accept: (wallet, scope, version = CONSENT_VERSION) =>
        set({ consents: { ...get().consents, [wallet]: { acceptedAt: Date.now(), scope, version } } }),
      withdraw: (wallet) => {
        const record = get().consents[wallet];
        if (!record) return;
        set({ consents: { ...get().consents, [wallet]: { ...record, withdrawnAt: Date.now() } } });
      },
      getConsent: (wallet) => {
        const record = wallet ? get().consents[wallet] : undefined;
        return record && !record.withdrawnAt && record.version === CONSENT_VERSION ? record : null;
      },
    }),
    {
      name: CONSENT_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ consents: state.consents }),
      onRehydrateStorage: () => () => {
        useConsentStore.setState({ isHydrated: true });
      },
    }
  )
);

export function waitForConsentHydration(): Promise<void> {
  if (useConsentStore.getState().isHydrated) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useConsentStore.subscribe((state) => {
      if (state.isHydrated) {
        unsubscribe();
        resolve();
      }
    });
  });
}
