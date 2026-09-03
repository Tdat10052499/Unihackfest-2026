import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type SolanaNetwork = 'devnet' | 'mainnet-beta';

export interface NetworkState {
  activeNetwork: SolanaNetwork;
  isHydrated: boolean;
  setNetwork: (network: SolanaNetwork) => void;
  toggleNetwork: () => void;
  setHydrated: (state: boolean) => void;
}

const isAvailable = Platform.OS !== 'web' || typeof window !== 'undefined';

const customStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (!isAvailable) return null;
    try {
      return await AsyncStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (!isAvailable) return;
    try {
      await AsyncStorage.setItem(name, value);
    } catch {}
  },
  removeItem: async (name: string): Promise<void> => {
    if (!isAvailable) return;
    try {
      await AsyncStorage.removeItem(name);
    } catch {}
  },
};

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set, get) => ({
      activeNetwork: 'mainnet-beta',
      isHydrated: false,
      setNetwork: (network: SolanaNetwork) => {
        set({ activeNetwork: network });
      },
      toggleNetwork: () => {
        const current = get().activeNetwork;
        set({ activeNetwork: current === 'devnet' ? 'mainnet-beta' : 'devnet' });
      },
      setHydrated: (state: boolean) => {
        set({ isHydrated: state });
      },
    }),
    {
      name: '@ned_solana_network_v2',
      storage: createJSONStorage(() => customStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);
