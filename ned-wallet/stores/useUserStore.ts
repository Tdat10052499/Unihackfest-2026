import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getUserProfileFromDB,
  upsertUserProfile,
  UserProfile,
} from '../services/supabase';

const STORAGE_KEYS = {
  USER_HANDLE: '@ned_wallet_user_handle',
  FULL_SNS: '@ned_wallet_full_sns',
  WALLET_ADDRESS: '@ned_wallet_address',
};

export interface UserState {
  username: string | null;
  walletAddress: string | null;
  privyId: string | null;
  linkedPhone: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUsername: (username: string | null) => void;
  setWalletAddress: (address: string | null) => void;
  setPrivyId: (privyId: string | null) => void;
  setLinkedPhone: (phone: string | null) => void;
  setUserProfile: (profile: Partial<UserProfile>) => void;
  loadFromStorage: () => Promise<string | null>;
  fetchUserProfile: (privyId: string) => Promise<UserProfile | null>;
  saveUserProfile: (params: {
    privy_id: string;
    wallet_address: string;
    username: string;
  }) => Promise<boolean>;
  resetUser: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  username: null,
  walletAddress: null,
  privyId: null,
  linkedPhone: null,
  isLoading: false,
  error: null,

  setUsername: (username: string | null) => {
    set({ username });
    if (username) {
      AsyncStorage.setItem(STORAGE_KEYS.USER_HANDLE, username).catch(() => {});
      AsyncStorage.setItem(STORAGE_KEYS.FULL_SNS, `@${username}.sol`).catch(() => {});
    }
  },

  setWalletAddress: (walletAddress: string | null) => {
    set({ walletAddress });
    if (walletAddress) {
      AsyncStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, walletAddress).catch(() => {});
    }
  },

  setPrivyId: (privyId: string | null) => {
    set({ privyId });
  },

  setLinkedPhone: (linkedPhone: string | null) => {
    set({ linkedPhone });
  },

  setUserProfile: (profile: Partial<UserProfile>) => {
    set((state) => ({
      username: profile.username !== undefined ? profile.username : state.username,
      walletAddress:
        profile.wallet_address !== undefined
          ? profile.wallet_address
          : state.walletAddress,
      privyId: profile.privy_id !== undefined ? profile.privy_id : state.privyId,
    }));
  },

  loadFromStorage: async (): Promise<string | null> => {
    try {
      const storedHandle = await AsyncStorage.getItem(STORAGE_KEYS.USER_HANDLE);
      if (storedHandle) {
        set({ username: storedHandle });
        return storedHandle;
      }
      return null;
    } catch (e) {
      console.warn('⚠️ [useUserStore] Không thể đọc username từ AsyncStorage:', e);
      return null;
    }
  },

  fetchUserProfile: async (privyId: string): Promise<UserProfile | null> => {
    if (!privyId) return null;
    try {
      set({ isLoading: true, error: null, privyId });
      // 1. Kiểm tra cache AsyncStorage trước để render tức thì
      const cachedHandle = await AsyncStorage.getItem(STORAGE_KEYS.USER_HANDLE);
      if (cachedHandle && !get().username) {
        set({ username: cachedHandle });
      }

      // 2. Fetch Source of Truth từ Supabase DB
      const dbProfile = await getUserProfileFromDB(privyId);
      if (dbProfile) {
        set({
          username: dbProfile.username,
          walletAddress: dbProfile.wallet_address,
          privyId: dbProfile.privy_id,
          isLoading: false,
        });
        if (dbProfile.username) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_HANDLE, dbProfile.username);
          await AsyncStorage.setItem(STORAGE_KEYS.FULL_SNS, `@${dbProfile.username}.sol`);
        }
        return dbProfile;
      }

      set({ isLoading: false });
      return null;
    } catch (err: any) {
      console.error('❌ [useUserStore] Lỗi fetchUserProfile:', err);
      set({ isLoading: false, error: err?.message || 'Lỗi tải thông tin user' });
      return null;
    }
  },

  saveUserProfile: async (params: {
    privy_id: string;
    wallet_address: string;
    username: string;
  }): Promise<boolean> => {
    try {
      set({ isLoading: true, error: null });
      // 1. Cập nhật state nội bộ ngay lập tức (Zero-latency UI)
      set({
        username: params.username,
        walletAddress: params.wallet_address,
        privyId: params.privy_id,
      });

      // 2. Lưu vào AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS.USER_HANDLE, params.username);
      await AsyncStorage.setItem(STORAGE_KEYS.FULL_SNS, `@${params.username}.sol`);
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, params.wallet_address);

      // 3. Upsert vào Supabase
      const res = await upsertUserProfile(params);
      set({ isLoading: false });
      return res.success;
    } catch (err: any) {
      console.error('❌ [useUserStore] Lỗi saveUserProfile:', err);
      set({ isLoading: false, error: err?.message || 'Lỗi lưu thông tin user' });
      return false;
    }
  },

  resetUser: () => {
    set({
      username: null,
      walletAddress: null,
      privyId: null,
      linkedPhone: null,
      isLoading: false,
      error: null,
    });
  },
}));
