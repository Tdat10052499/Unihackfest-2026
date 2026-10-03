// Records cache on this device (build-plan B5): AsyncStorage `@ned_records_v1:<wallet>`, brought up to date from the
// chain by syncRecords. One sync per wallet at a time, shared by the contract watcher and the Records screen.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConnection } from '@ned/core/config.ts';
import type { FundAccount } from './decode';
import { loadRecords, saveRecords, syncRecords, type RecordsCache } from './records';
import type { KeyStorage } from './keys';

const storage: KeyStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
};

type Listener = (wallet: string, cache: RecordsCache) => void;
const listeners = new Set<Listener>();
const running = new Map<string, Promise<RecordsCache>>();

export const readRecords = (wallet: string) => loadRecords(storage, wallet);

export function onRecordsChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Reads new releases from the chain and saves them; `open` are the open contracts of this wallet */
export function refreshRecords(wallet: string, open: FundAccount[]): Promise<RecordsCache> {
  const current = running.get(wallet);
  if (current) return current;
  const job = (async () => {
    const cache = await loadRecords(storage, wallet);
    const next = await syncRecords(getConnection(), wallet, open, cache);
    if (next !== cache) {
      await saveRecords(storage, wallet, next);
      listeners.forEach((l) => l(wallet, next));
    }
    return next;
  })().finally(() => running.delete(wallet));
  running.set(wallet, job);
  return job;
}
