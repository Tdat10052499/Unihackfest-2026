// The user's OWN phone number in clear — stored only on the device (native: expo-secure-store; web: localStorage), never on chain.
// Shown in Settings. On chain there is only phone_key = scrypt(phone) (see phoneKey.ts).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'ned_own_phone_e164';

export async function saveOwnPhone(e164: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.setItem(KEY, e164);
    } catch {}
    return;
  }
  await SecureStore.setItemAsync(KEY, e164);
}

export async function getOwnPhone(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return window.localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(KEY);
}

export async function removeOwnPhone(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.removeItem(KEY);
    } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
