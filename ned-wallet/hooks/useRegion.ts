// Region of the signed-in wallet: 'vn' (Vietnam view, VND estimates, payout partner) or 'intl'.
// Backed by stores/useRegionStore (per wallet, persisted at @ned_region_v1). null until chosen in onboarding.
import { useCallback } from 'react';
import { useAuth } from '../services/auth';
import type { Region } from '../services/milestone/view';
import { useRegionStore } from '../stores/useRegionStore';

export function useRegion(): { region: Region | null; setRegion(r: Region): void } {
  const { walletAddress } = useAuth();
  const region = useRegionStore((s) => (walletAddress ? s.regions[walletAddress] ?? null : null));
  const store = useRegionStore((s) => s.setRegion);
  const setRegion = useCallback(
    (r: Region) => {
      if (walletAddress) store(walletAddress, r);
    },
    [walletAddress, store]
  );
  return { region, setRegion };
}
