import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useUserStore } from '../stores/useUserStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import { useNotificationSync } from '../hooks/useNotificationSync';
import { useContractWatch } from '../hooks/useContractWatch';
import { NotificationInAppBanner } from './NotificationInAppBanner';

/**
 * Global Notification Manager
 * Keeps on-chain notices in sync on every screen of the app
 * and shows NotificationInAppBanner sliding down when money arrives
 */
export function GlobalNotificationManager() {
  const userWallet = useUserStore((state) => state.walletAddress);
  const activeWalletStore = useNotificationStore((state) => state.activeWalletAddress);

  const activeWallet = userWallet || activeWalletStore;

  // Continuous on-chain polling
  useNotificationSync(activeWallet);
  // Contract changes (B5): new contract, locked, submitted, released
  useContractWatch();

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <NotificationInAppBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 999,
  },
});
