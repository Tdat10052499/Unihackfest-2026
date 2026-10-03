// Money view of the signed-in wallet: 'vn' (Vietnam view, VND estimates, no client actions, D18) or 'intl'.
// Stored on this computer per wallet, like the phone. Until the user chooses, the view is 'vn' (product-spec 4.2:
// "I live in Vietnam", default on) and the Workspace asks once (RegionPrompt, workspace-plan section 3).
import { useCallback, useSyncExternalStore } from 'react';
import type { Region } from '@ned/core/milestone/view.ts';

const key = (wallet: string) => `ned.region.${wallet}`;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

/** The stored choice, or null when this wallet has not chosen on this computer */
function stored(wallet: string | null): Region | null {
  if (!wallet) return null;
  try {
    const value = localStorage.getItem(key(wallet));
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
