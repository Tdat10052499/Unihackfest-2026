import { clearSolanaCache } from '../services/solana';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOwnPhone, saveOwnPhone } from '../services/identity/ownPhone';
import { PublicKey } from '@solana/web3.js';
import { fetchReverseRecord } from '../services/identity/dualPda';
import { identityConnection } from '../services/identity/resolve';
interface UserProfile { wallet_address: string; username: string; phone_number?: string | null }

const STORAGE_KEYS = {
  USER_HANDLE: '@ned_wallet_user_handle',
  WALLET_ADDRESS: '@ned_wallet_address',
};

export interface UserState {
  username: string | null;
  walletAddress: string | null;
  linkedPhone: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUsername: (username: string | null) => void;
  setWalletAddress: (address: string | null) => void;
  setLinkedPhone: (phone: string | null) => void;
  loadFromStorage: () => Promise<string | null>;
  fetchUserProfile: (walletAddress: string) => Promise<UserProfile | null>;
  resetUser: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  username: null,
  walletAddress: null,
  linkedPhone: null,
  isLoading: false,
  error: null,

  setUsername: (username: string | null) => {
    set({ username });
    if (username) {
      AsyncStorage.setItem(STORAGE_KEYS.USER_HANDLE, username).catch(() => {});
    }
  },

  setWalletAddress: (walletAddress: string | null) => {
    set({ walletAddress });
    if (walletAddress) {
      AsyncStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, walletAddress).catch(() => {});
    }
  },

  setLinkedPhone: (linkedPhone: string | null) => {
    set({ linkedPhone });
    if (linkedPhone) {
      // The phone number in clear is stored only on the device, securely (SecureStore / localStorage)
      saveOwnPhone(linkedPhone).catch(() => {});
    }
  },

  loadFromStorage: async (): Promise<string | null> => {
    try {
      const storedHandle = await AsyncStorage.getItem(STORAGE_KEYS.USER_HANDLE);
      const storedPhone = (await getOwnPhone());

      if (storedPhone && !get().linkedPhone) {
        set({ linkedPhone: storedPhone });
      }
      if (storedHandle) {
        set({ username: storedHandle });
        return storedHandle;
      }
      return null;
    } catch (e) {
      console.warn('⚠️ [useUserStore] Could not read username/phone/avatar/externalWallet from AsyncStorage:', e);
      return null;
    }
  },

  fetchUserProfile: async (walletAddress: string): Promise<UserProfile | null> => {
    if (!walletAddress) return null;
    set({ isLoading: true, error: null, walletAddress });
    try {
      const record = await fetchReverseRecord(identityConnection, new PublicKey(walletAddress));
      const phone = record?.hasPhone ? await getOwnPhone() : null;
      if (get().walletAddress !== walletAddress) return null;
      set({ username: record?.username ?? null, linkedPhone: phone, isLoading: false });
      if (!record) return null;
      await AsyncStorage.setItem(STORAGE_KEYS.USER_HANDLE, record.username);
      return { wallet_address: walletAddress, username: record.username, phone_number: phone };
    } catch {
      if (get().walletAddress === walletAddress) set({ isLoading: false, error: 'Unable to load on-chain profile.' });
      return null;
    }
  },

  resetUser: () => {
    clearSolanaCache();
    set({
      username: null,
      walletAddress: null,
      linkedPhone: null,
      isLoading: false,
      error: null,
    });
  },
}));
