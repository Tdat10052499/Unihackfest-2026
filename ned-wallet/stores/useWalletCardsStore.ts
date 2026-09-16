import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Re-declare interface to avoid circular dependency with NeoPhysicalWalletCard
export interface StablecoinCardData {
  id: string;
  currency: string;
  name: string;
  symbol: string;
  themeColor: string;
  badgeBg: string;
  balanceUsd: string;
  balanceFormatted: string;
  accountName: string;
  maskedWallet: string;
  network?: string;
  rateInfo?: string;
  logoUrl?: string;
}

export const DEFAULT_USDC_CARD: StablecoinCardData = {
  id: 'usdc_default',
  currency: 'USDC',
  name: 'US DOLLAR',
  symbol: '$',
  themeColor: '#00E5FF',
  badgeBg: '#FFFFFF',
  balanceUsd: '$0.00',
  balanceFormatted: '$0.00',
  accountName: 'N.E.D User',
  maskedWallet: '**** ****',
  rateInfo: '1 USDC = $1.00',
  logoUrl: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/usdc.png',
};

export interface WalletCardsState {
  walletCards: StablecoinCardData[];
  addCard: (card: StablecoinCardData) => void;
  removeCard: (id: string) => void;
  resetCards: () => void;
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

export const useWalletCardsStore = create<WalletCardsState>()(
  persist(
    (set) => ({
      walletCards: [DEFAULT_USDC_CARD],
      addCard: (card) => set((state) => {
        const isDuplicate = state.walletCards.some(c => c.currency === card.currency);
        if (isDuplicate) return state;
        return {
          walletCards: [...state.walletCards, card]
        };
      }),
      removeCard: (id) => set((state) => ({
        walletCards: state.walletCards.filter(c => c.id !== id)
      })),
      resetCards: () => set({ walletCards: [DEFAULT_USDC_CARD] }),
    }),
    {
      name: '@ned_wallet_cards_v1',
      storage: createJSONStorage(() => customStorage),
    }
  )
);
