import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOwnPhone, removeOwnPhone, saveOwnPhone } from './identity/ownPhone';
import { REGION_STORAGE_KEY, useRegionStore } from '../stores/useRegionStore';
import { keysToClearOnSignOut } from './signOutKeys';
import { useAccountStore } from '../stores/useAccountStore';

const STORAGE_KEYS = {
  ACTIVITIES: '@ned_wallet_activities',
  LINKED_PHONE: '@ned_wallet_linked_phone',
};

/**
 * Saves the transaction history list to the local cache
 */
export const cacheActivities = async (activities: any[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
  } catch (error) {
    console.error('Error caching activities to AsyncStorage:', error);
  }
};

/**
 * Reads the transaction history list from the local cache
 */
export const getCachedActivities = async (): Promise<any[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Swap was removed on 9 Oct 2026: drop the demo swaps that older caches still hold
        return parsed.filter(
          (a) =>
            a &&
            a.demoSwap !== true &&
            a.amount !== '$0.00' &&
            a.amount !== '-$0.00' &&
            a.amount !== '+$0.00' &&
            !a.amount?.includes?.('SOL') &&
            !a.title?.includes?.('Web3')
        );
      }
    }
    return null;
  } catch (error) {
    console.error('Error reading cached activities from AsyncStorage:', error);
    return null;
  }
};

/**
 * Reads the linked phone number
 */
export const getLinkedPhone = async (): Promise<string | null> => {
  // The user's own phone number in clear: SecureStore (native) / localStorage (web), never AsyncStorage
  try {
    return await getOwnPhone();
  } catch (error) {
    console.error('Error reading linkedPhone:', error);
    return null;
  }
};

/**
 * Saves the linked phone number
 */
export const setLinkedPhone = async (phone: string): Promise<void> => {
  try {
    await saveOwnPhone(phone);
  } catch (error) {
    console.error('Error setting linkedPhone:', error);
  }
};

/**
 * Deep clean of all corrupted state, safe logout and a full AsyncStorage wipe
 */
export const executeHardReset = async (logoutFn?: () => Promise<void>): Promise<void> => {
  console.log('🧹 [Hard Reset] Starting a deep clean of the session and caches...');

  if (typeof logoutFn === 'function') {
    try {
      await Promise.race([
        logoutFn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 2500)),
      ]);
      console.log('✅ [Hard Reset] Signed out');
    } catch (logoutErr) {
      console.warn('⚠️ [Hard Reset] Ignoring the logout timeout (mfa:clear / user-signer):', logoutErr);
    }
  }

  // Region (N11): empty the in-memory store too, or persist would write the old state back. P1: the consent log is
  // kept (state and storage), with withdrawnAt when the user withdrew; getConsent() ignores withdrawn records.
  // D30: the account profile (role, country, business) goes; the agreement log in the same key stays
  try {
    // Only when there is something to clear, so a flag-off build never writes the key
    const accounts = useAccountStore.getState();
    if (Object.keys(accounts.profiles).length) accounts.clearProfiles();
  } catch (err) {
    console.warn('[Hard Reset] could not clear the account profile:', err);
  }

  try {
    useRegionStore.setState({ regions: {} });
    await AsyncStorage.multiRemove([REGION_STORAGE_KEY]);
  } catch (err) {
    console.warn('[Hard Reset] could not clear region:', err);
  }

  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keysToClearOnSignOut(keys));
    // The user's own phone number lives outside AsyncStorage → removed separately at sign-out
    await removeOwnPhone().catch(() => {});
    console.log('✅ [Hard Reset] AsyncStorage cleaned (local profiles kept)');
  } catch (storageErr) {
    console.error('Could not clear AsyncStorage:', storageErr);
  }
};
