import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { CLUSTER } from '../constants/chain';

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

/**
 * B7: this build signs on devnet only, so the network is always CLUSTER. A persisted or requested
 * 'mainnet-beta' is ignored (the type stays for the hidden Swap/xStocks code).
 */
function devnetOnly(requested: SolanaNetwork): SolanaNetwork {
  if (requested !== CLUSTER) console.warn(`[network] ${requested} is not available in this build; staying on ${CLUSTER}.`);
  return CLUSTER;
}

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set, get) => ({
      activeNetwork: CLUSTER,
      isHydrated: false,
      setNetwork: (network: SolanaNetwork) => {
        set({ activeNetwork: devnetOnly(network) });
      },
      toggleNetwork: () => {
        set({ activeNetwork: devnetOnly(get().activeNetwork === 'devnet' ? 'mainnet-beta' : 'devnet') });
      },
      setHydrated: (state: boolean) => {
        set({ isHydrated: state });
      },
    }),
    {
      name: '@ned_solana_network_v2',
      storage: createJSONStorage(() => customStorage),
      // Ignore a persisted 'mainnet-beta' from an older build
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<NetworkState>), activeNetwork: CLUSTER }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);
