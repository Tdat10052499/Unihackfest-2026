import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const isAvailable = Platform.OS !== 'web' || typeof window !== 'undefined';

const STORAGE_KEYS = {
  BALANCE: '@ned_wallet_balance',
  ACTIVITIES: '@ned_wallet_activities',
  WALLET_ADDRESS: '@ned_wallet_address',
  HAS_SKIPPED_PHONE_LINK: '@ned_wallet_has_skipped_phone_link',
  LINKED_PHONE: '@ned_wallet_linked_phone',
};

/**
 * Lưu số dư SOL vào local cache
 */
export const cacheBalance = async (balance: number): Promise<void> => {
  if (!isAvailable) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.BALANCE, JSON.stringify(balance));
  } catch (error) {
    console.error('Error caching balance to AsyncStorage:', error);
  }
};

/**
 * Lấy số dư SOL đã lưu trong local cache
 */
export const getCachedBalance = async (): Promise<number | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BALANCE);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'number') {
        return parsed;
      }
    }
    return null;
  } catch (error) {
    console.error('Error reading cached balance from AsyncStorage:', error);
    return null;
  }
};

/**
 * Lưu danh sách lịch sử giao dịch vào local cache
 */
export const cacheActivities = async (activities: any[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
  } catch (error) {
    console.error('Error caching activities to AsyncStorage:', error);
  }
};

/**
 * Lấy danh sách lịch sử giao dịch từ local cache
 */
export const getCachedActivities = async (): Promise<any[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    return null;
  } catch (error) {
    console.error('Error reading cached activities from AsyncStorage:', error);
    return null;
  }
};

/**
 * Lưu địa chỉ ví Solana vào local cache
 */
export const cacheWalletAddress = async (address: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, address);
  } catch (error) {
    console.error('Error caching wallet address:', error);
  }
};

/**
 * Lấy địa chỉ ví Solana từ local cache
 */
export const getCachedWalletAddress = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
  } catch (error) {
    console.error('Error reading cached wallet address:', error);
    return null;
  }
};

/**
 * Kiểm tra người dùng đã từng bấm Bỏ qua liên kết SĐT hay chưa
 */
export const getHasSkippedPhoneLink = async (): Promise<boolean> => {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.HAS_SKIPPED_PHONE_LINK);
    return val === 'true';
  } catch (error) {
    console.error('Error reading hasSkippedPhoneLink:', error);
    return false;
  }
};

/**
 * Lưu cờ Bỏ qua liên kết SĐT vào AsyncStorage
 */
export const setHasSkippedPhoneLink = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.HAS_SKIPPED_PHONE_LINK, 'true');
  } catch (error) {
    console.error('Error setting hasSkippedPhoneLink:', error);
  }
};

/**
 * Lấy số điện thoại đã liên kết
 */
export const getLinkedPhone = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.LINKED_PHONE);
  } catch (error) {
    console.error('Error reading linkedPhone:', error);
    return null;
  }
};

/**
 * Lưu số điện thoại đã liên kết vào AsyncStorage
 */
export const setLinkedPhone = async (phone: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LINKED_PHONE, phone);
  } catch (error) {
    console.error('Error setting linkedPhone:', error);
  }
};

/**
 * Xóa số điện thoại đã liên kết khỏi AsyncStorage
 */
export const removeLinkedPhone = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.LINKED_PHONE);
  } catch (error) {
    console.error('Error removing linkedPhone from AsyncStorage:', error);
  }
};

/**
 * Dọn dẹp sâu toàn bộ Corrupted State, logout an toàn và xóa sạch AsyncStorage
 */
export const executeHardReset = async (logoutFn?: () => Promise<void>): Promise<void> => {
  console.log('🧹 [Hard Reset] Bắt đầu dọn dẹp sâu session và bộ nhớ đệm...');
  if (typeof logoutFn === 'function') {
    try {
      await Promise.race([
        logoutFn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 2500)),
      ]);
      console.log('✅ [Hard Reset] Đã logout Privy thành công');
    } catch (logoutErr) {
      console.warn('⚠️ [Hard Reset] Bỏ qua lỗi timeout logout (mfa:clear / user-signer):', logoutErr);
    }
  }

  try {
    await AsyncStorage.clear();
    console.log('✅ [Hard Reset] Đã dọn dẹp sạch sẽ 100% AsyncStorage');
  } catch (storageErr) {
    console.error('Lỗi khi xóa AsyncStorage:', storageErr);
  }
};

