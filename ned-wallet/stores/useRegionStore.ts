// Khu vực của người dùng theo từng ví: 'vn' (Vietnam view: VND ước tính, payout partner) hoặc 'intl'.
// product-spec 4.2: cài đặt cục bộ "I live in Vietnam", chọn khi onboarding và trong Settings (non-ui-plan N11).
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Region } from '../services/milestone/view';

export const REGION_STORAGE_KEY = '@ned_region_v1';

interface RegionState {
  /** wallet address → region */
  regions: Record<string, Region>;
  isHydrated: boolean;
  setRegion: (wallet: string, region: Region) => void;
  getRegion: (wallet: string | null | undefined) => Region | null;
}

export const useRegionStore = create<RegionState>()(
  persist(
    (set, get) => ({
      regions: {},
      isHydrated: false,
      setRegion: (wallet, region) => set({ regions: { ...get().regions, [wallet]: region } }),
      getRegion: (wallet) => (wallet ? get().regions[wallet] ?? null : null),
    }),
    {
      name: REGION_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ regions: state.regions }),
      onRehydrateStorage: () => () => {
        useRegionStore.setState({ isHydrated: true });
      },
    }
  )
);

/** Chờ store đọc xong AsyncStorage (dùng trước khi quyết định bước onboarding) */
export function waitForRegionHydration(): Promise<void> {
  if (useRegionStore.getState().isHydrated) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useRegionStore.subscribe((state) => {
      if (state.isHydrated) {
        unsubscribe();
        resolve();
      }
    });
  });
}
