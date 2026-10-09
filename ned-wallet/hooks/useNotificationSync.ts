import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useNotificationStore } from '../stores/useNotificationStore';

/**
 * Syncs notices from the on-chain history (Helius RPC) every 8s
 * to detect money received from any source.
 * TODO(Phase 1): replace polling with a Helius WebSocket (accountSubscribe/logsSubscribe on the USDC ATA).
 */
export function useNotificationSync(walletAddress?: string | null) {
  const { loadNotifications } = useNotificationStore();
  const syncIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (!walletAddress) return;

    // 1. Load the wallet's saved notices
    loadNotifications(walletAddress, true);

    // 2. Automatic on-chain check every 8s, in case money arrives from outside or the faucet
    syncIntervalRef.current = setInterval(() => {
      loadNotifications(walletAddress, true);
    }, 8000);

    // 3. Listen for the app coming back from the background
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        loadNotifications(walletAddress, true);
      }
    });

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      appStateSub.remove();
    };
  }, [walletAddress]);
}
