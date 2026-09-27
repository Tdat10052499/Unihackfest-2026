// Chế độ ví Simple / Crypto (OnbMode) — lưu theo từng ví trong AsyncStorage.
// Chế độ Crypto chỉ là cách hiển thị khác của cùng ví N.E.D (docs/01-dinh-huong-du-an.md, Cập nhật 26/09).
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WalletMode = 'simple' | 'crypto';

interface WalletModeState {
  /** wallet address → mode đã chọn */
  modes: Record<string, WalletMode>;
  isHydrated: boolean;
  setMode: (wallet: string, mode: WalletMode) => void;
  getMode: (wallet: string | null | undefined) => WalletMode | null;
}

export const useWalletModeStore = create<WalletModeState>()(
  persist(
    (set, get) => ({
      modes: {},
      isHydrated: false,
      setMode: (wallet, mode) => set({ modes: { ...get().modes, [wallet]: mode } }),
      getMode: (wallet) => (wallet ? get().modes[wallet] ?? null : null),
    }),
    {
      name: '@ned_wallet_mode_v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ modes: state.modes }),
      onRehydrateStorage: () => () => {
        useWalletModeStore.setState({ isHydrated: true });
      },
    }
  )
);

/** Chờ store đọc xong AsyncStorage (dùng trước khi quyết định có cần màn chọn mode) */
export function waitForWalletModeHydration(): Promise<void> {
  if (useWalletModeStore.getState().isHydrated) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useWalletModeStore.subscribe((state) => {
      if (state.isHydrated) {
        unsubscribe();
        resolve();
      }
    });
  });
}
