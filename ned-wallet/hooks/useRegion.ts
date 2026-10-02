// Region of the signed-in user: 'vn' (Vietnam view, VND estimates, payout partner) or 'intl'.
// TODO(N11): read and write stores/useRegionStore (per wallet, key @ned_region_v1, persisted).
// Until then this is an in-memory stub that defaults to 'vn' (product-spec 4.2: "I live in Vietnam", default on).
import { useSyncExternalStore } from 'react';
import type { Region } from '../services/milestone/view';

let current: Region = 'vn';
const listeners = new Set<() => void>();

export function setRegionStub(region: Region) {
  current = region;
  listeners.forEach((l) => l());
}

export function useRegion(): { region: Region | null; setRegion(r: Region): void } {
  const region = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current
  );
  return { region, setRegion: setRegionStub };
}
