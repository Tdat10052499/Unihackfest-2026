import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOwnPhone, removeOwnPhone, saveOwnPhone } from './identity/ownPhone';
import { parseDemoSwaps, serializeDemoSwaps } from './history';
import { REGION_STORAGE_KEY, useRegionStore } from '../stores/useRegionStore';
import { keysToClearOnSignOut } from './signOutKeys';

const STORAGE_KEYS = {
  ACTIVITIES: '@ned_wallet_activities',
  LINKED_PHONE: '@ned_wallet_linked_phone',
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
        return parsed.filter(
          (a) =>
            a &&
            a.demoSwap === true ||
            (a &&
            a.amount !== '$0.00' &&
            a.amount !== '-$0.00' &&
            a.amount !== '+$0.00' &&
            !a.amount?.includes?.('SOL') &&
            !a.title?.includes?.('Web3'))
        );
      }
    }
    return null;
  } catch (error) {
    console.error('Error reading cached activities from AsyncStorage:', error);
    return null;
  }
};

export const saveDemoSwap = async (swap: Record<string, unknown>, wallet?: string | null): Promise<void> => {
  const key = `${STORAGE_KEYS.ACTIVITIES}:${wallet || 'anonymous'}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    const item = { id: `demo-swap-${Date.now()}`, iconBg: '#7B2FBE', isPositive: false, amount: String(swap.amount || ''), time: new Date().toISOString(), ...swap, nedFee: '0.25%', type: 'sent', demoSwap: true };
    const next = [item, ...(Array.isArray(list) ? list : [])].slice(0, 50);
    await AsyncStorage.setItem(key, serializeDemoSwaps(next));
    const sharedRaw = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    const shared = sharedRaw ? JSON.parse(sharedRaw) : [];
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify([item, ...(Array.isArray(shared) ? shared : [])].slice(0, 100)));
  } catch (error) { console.error('Error caching demo swap:', error); }
};

export const getDemoSwaps = async (wallet?: string | null): Promise<any[]> => {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEYS.ACTIVITIES}:${wallet || 'anonymous'}`);
    return parseDemoSwaps(raw);
  } catch (error) { console.error('Error reading demo swaps:', error); return []; }
};

/**
 * Lấy số điện thoại đã liên kết
 */
export const getLinkedPhone = async (): Promise<string | null> => {
  // SĐT dạng rõ của chính người dùng: SecureStore (native) / localStorage (web) — không dùng AsyncStorage
  try {
    return await getOwnPhone();
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
    await saveOwnPhone(phone);
  } catch (error) {
    console.error('Error setting linkedPhone:', error);
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
      console.log('✅ [Hard Reset] Đã đăng xuất thành công');
    } catch (logoutErr) {
      console.warn('⚠️ [Hard Reset] Bỏ qua lỗi timeout logout (mfa:clear / user-signer):', logoutErr);
    }
  }

  // Region (N11): empty the in-memory store too, or persist would write the old state back. P1: the consent log is
  // kept (state and storage), with withdrawnAt when the user withdrew; getConsent() ignores withdrawn records.
  try {
    useRegionStore.setState({ regions: {} });
    await AsyncStorage.multiRemove([REGION_STORAGE_KEY]);
  } catch (err) {
    console.warn('[Hard Reset] could not clear region:', err);
  }

  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keysToClearOnSignOut(keys));
    // SĐT của chính người dùng nằm ngoài AsyncStorage → xoá riêng khi đăng xuất
    await removeOwnPhone().catch(() => {});
    console.log('✅ [Hard Reset] Đã dọn dẹp AsyncStorage (giữ hồ sơ cục bộ)');
  } catch (storageErr) {
    console.error('Lỗi khi xóa AsyncStorage:', storageErr);
  }
};
