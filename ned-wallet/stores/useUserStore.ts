import { clearSolanaCache } from '../services/solana';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOwnPhone, saveOwnPhone } from '../services/identity/ownPhone';
import { PublicKey } from '@solana/web3.js';
import { fetchReverseRecord } from '../services/identity/dualPda';
import { identityConnection } from '../services/identity/resolve';
interface UserProfile { wallet_address: string; username: string; auth_user_id?: string; phone_number?: string | null; avatar_url?: string | null; linked_external_wallet?: string | null }

const STORAGE_KEYS = {
  USER_HANDLE: '@ned_wallet_user_handle',
  FULL_SNS: '@ned_wallet_full_sns',
  WALLET_ADDRESS: '@ned_wallet_address',
  LINKED_EXTERNAL_WALLET: '@ned_wallet_linked_external_wallet',
  AVATAR_URL: '@ned_wallet_avatar_url',
};

export interface UserState {
  username: string | null;
  walletAddress: string | null;
  authUserId: string | null;
  linkedPhone: string | null;
  linkedExternalWallet: string | null;
  avatarUrl: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUsername: (username: string | null) => void;
  setWalletAddress: (address: string | null) => void;
  setAuthUserId: (authUserId: string | null) => void;
  setLinkedPhone: (phone: string | null) => void;
  setLinkedExternalWallet: (address: string | null) => void;
  setAvatarUrl: (url: string | null) => void;
  setUserProfile: (profile: Partial<UserProfile>) => void;
  loadFromStorage: () => Promise<string | null>;
  fetchUserProfile: (authUserId: string) => Promise<UserProfile | null>;
  resetUser: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  username: null,
  walletAddress: null,
  authUserId: null,
  linkedPhone: null,
  linkedExternalWallet: null,
  avatarUrl: null,
  isLoading: false,
  error: null,

  setUsername: (username: string | null) => {
    set({ username });
    if (username) {
      AsyncStorage.setItem(STORAGE_KEYS.USER_HANDLE, username).catch(() => {});
      AsyncStorage.setItem(STORAGE_KEYS.FULL_SNS, `@${username}`).catch(() => {});
    }
  },

  setWalletAddress: (walletAddress: string | null) => {
    set({ walletAddress });
    if (walletAddress) {
      AsyncStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, walletAddress).catch(() => {});
    }
  },

  setAuthUserId: (authUserId: string | null) => {
    set({ authUserId });
  },

  setLinkedPhone: (linkedPhone: string | null) => {
    set({ linkedPhone });
    if (linkedPhone) {
      // SĐT dạng rõ chỉ lưu an toàn trên máy (SecureStore / localStorage)
      saveOwnPhone(linkedPhone).catch(() => {});
    }
  },

  setLinkedExternalWallet: (linkedExternalWallet: string | null) => {
    set({ linkedExternalWallet });
    if (linkedExternalWallet) {
      AsyncStorage.setItem(STORAGE_KEYS.LINKED_EXTERNAL_WALLET, linkedExternalWallet).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_KEYS.LINKED_EXTERNAL_WALLET).catch(() => {});
    }
  },

  setAvatarUrl: (avatarUrl: string | null) => {
    set({ avatarUrl });
    if (avatarUrl) {
      AsyncStorage.setItem(STORAGE_KEYS.AVATAR_URL, avatarUrl).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_KEYS.AVATAR_URL).catch(() => {});
    }
  },

  setUserProfile: (profile: Partial<UserProfile>) => {
    set((state) => ({
      username: profile.username !== undefined ? profile.username : state.username,
      walletAddress:
        profile.wallet_address !== undefined
          ? profile.wallet_address
          : state.walletAddress,
      authUserId: profile.auth_user_id !== undefined ? profile.auth_user_id : state.authUserId,
      linkedPhone:
        profile.phone_number !== undefined
          ? profile.phone_number
          : state.linkedPhone,
      linkedExternalWallet:
        profile.linked_external_wallet !== undefined
          ? profile.linked_external_wallet
          : state.linkedExternalWallet,
      avatarUrl:
        profile.avatar_url !== undefined
          ? profile.avatar_url
          : state.avatarUrl,
    }));
    if (profile.avatar_url) {
      AsyncStorage.setItem(STORAGE_KEYS.AVATAR_URL, profile.avatar_url).catch(() => {});
    }
    if (profile.linked_external_wallet) {
      AsyncStorage.setItem(STORAGE_KEYS.LINKED_EXTERNAL_WALLET, profile.linked_external_wallet).catch(() => {});
    }
  },

  loadFromStorage: async (): Promise<string | null> => {
    try {
      const storedHandle = await AsyncStorage.getItem(STORAGE_KEYS.USER_HANDLE);
      const storedPhone = (await getOwnPhone());
      const storedAvatar = await AsyncStorage.getItem(STORAGE_KEYS.AVATAR_URL);
      const storedExternal = await AsyncStorage.getItem(STORAGE_KEYS.LINKED_EXTERNAL_WALLET);

      if (storedPhone && !get().linkedPhone) {
        set({ linkedPhone: storedPhone });
      }
      if (storedAvatar && !get().avatarUrl) {
        set({ avatarUrl: storedAvatar });
      }
      if (storedExternal && !get().linkedExternalWallet) {
        set({ linkedExternalWallet: storedExternal });
      }
      if (storedHandle) {
        set({ username: storedHandle });
        return storedHandle;
      }
      return null;
    } catch (e) {
      console.warn('⚠️ [useUserStore] Không thể đọc username/phone/avatar/externalWallet từ AsyncStorage:', e);
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
      authUserId: null,
      linkedPhone: null,
      linkedExternalWallet: null,
      avatarUrl: null,
      isLoading: false,
      error: null,
    });
  },
}));
