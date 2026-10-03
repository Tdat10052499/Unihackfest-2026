// Where this device keeps contract content keys: AsyncStorage, one entry per wallet
// (`@ned_contract_keys_v1:<wallet>` → { fund: base64url K }). The key never leaves the device except in the
// invite link: never log it, never put it in an error or a notification.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KeyStorage } from './keys';

export const contractKeyStorage: KeyStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
};
