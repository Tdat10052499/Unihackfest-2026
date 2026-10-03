// Money view of the signed-in wallet: 'vn' (Vietnam view, VND estimates, no client actions, D18) or 'intl'.
// Stored on this computer per wallet, like the phone. Default 'vn' (product-spec 4.2: "I live in Vietnam", default on).
// TODO(W2): ask once in the Workspace when it is missing (workspace-plan section 3).
import { useCallback, useSyncExternalStore } from 'react';
import type { Region } from '@ned/core/milestone/view.ts';

const key = (wallet: string) => `ned.region.${wallet}`;
const listeners = new Set<() => void>();

function read(wallet: string | null): Region {
  if (!wallet) return 'vn';
  try {
    const value = localStorage.getItem(key(wallet));
    return value === 'intl' ? 'intl' : 'vn';
  } catch {
    return 'vn';
  }
}

export function useRegion(wallet: string | null): { region: Region; setRegion(r: Region): void } {
  const region = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => read(wallet),
    () => 'vn' as Region
  );
  const setRegion = useCallback(
    (r: Region) => {
      if (!wallet) return;
      try {
        localStorage.setItem(key(wallet), r);
      } catch {
        // storage blocked: keep the default view
      }
      listeners.forEach((l) => l());
    },
    [wallet]
  );
  return { region, setRegion };
}
