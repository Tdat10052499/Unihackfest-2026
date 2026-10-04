// Money view of the signed-in wallet: 'vn' (Vietnam view, VND estimates, no client actions, D18) or 'intl'.
// Stored on this computer per wallet. Since W6 the Workspace also reads and writes the phone app's store
// (`@ned_region_v1`, zustand JSON), because the app runs on this origin in the wallet extension: one choice for both. Until the user chooses, the view is 'vn' (product-spec 4.2:
// "I live in Vietnam", default on) and the Workspace asks once (RegionPrompt, workspace-plan section 3).
import { useCallback, useSyncExternalStore } from 'react';
import type { Region } from '@ned/core/milestone/view.ts';

const key = (wallet: string) => `ned.region.${wallet}`;
/** The phone app's persisted region store (ned-wallet/stores/useRegionStore.ts) */
const APP_STORE = '@ned_region_v1';

function appRegions(): Record<string, string> {
  try {
    const raw = localStorage.getItem(APP_STORE);
    return (raw ? (JSON.parse(raw) as { state?: { regions?: Record<string, string> } }).state?.regions : undefined) ?? {};
  } catch {
    return {};
  }
}
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
// A change made by the phone app in the extension (another document on this origin) shows up here too
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === APP_STORE || e.key?.startsWith('ned.region.')) notify();
  });
}

/** The stored choice, or null when this wallet has not chosen on this computer */
function stored(wallet: string | null): Region | null {
  if (!wallet) return null;
  try {
    const value = localStorage.getItem(key(wallet)) ?? appRegions()[wallet] ?? null;
    return value === 'intl' || value === 'vn' ? value : null;
  } catch {
    return null;
  }
}

/** "Change" in the wallet panel opens the prompt again */
let promptOpen = false;
export function openRegionPrompt(): void {
  promptOpen = true;
  notify();
}

export function useRegion(wallet: string | null): { region: Region; chosen: boolean; prompt: boolean; setRegion(r: Region): void } {
  const choice = useSyncExternalStore(subscribe, () => stored(wallet), () => null);
  const prompt = useSyncExternalStore(subscribe, () => promptOpen, () => false);
  const setRegion = useCallback(
    (r: Region) => {
      if (!wallet) return;
      try {
        localStorage.setItem(key(wallet), r);
        // the same choice for the phone app in the extension (it rehydrates on the storage event)
        const raw = localStorage.getItem(APP_STORE);
        const store = raw ? (JSON.parse(raw) as { state?: { regions?: Record<string, string> }; version?: number }) : { version: 0 };
        localStorage.setItem(APP_STORE, JSON.stringify({ ...store, state: { ...store.state, regions: { ...store.state?.regions, [wallet]: r } } }));
      } catch {
        // storage blocked: the choice lasts until the page is reloaded
      }
      promptOpen = false;
      notify();
    },
    [wallet]
  );
  return { region: choice ?? 'vn', chosen: choice !== null, prompt: Boolean(wallet) && (prompt || choice === null), setRegion };
}
