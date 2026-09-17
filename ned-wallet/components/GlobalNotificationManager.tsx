import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useUserStore } from '../stores/useUserStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import { useNotificationRealtime } from '../hooks/useNotificationRealtime';
import { NotificationInAppBanner } from './NotificationInAppBanner';

/**
 * Quản lý Thông báo Toàn cục (Global Notification Manager)
 * Đảm bảo lắng nghe Realtime & On-chain trên toàn bộ các màn hình của ứng dụng
 * và hiển thị NotificationInAppBanner trượt từ trên xuống khi nhận tiền
 */
export function GlobalNotificationManager() {
  const userWallet = useUserStore((state) => state.walletAddress);
  const activeWalletStore = useNotificationStore((state) => state.activeWalletAddress);

  const activeWallet = userWallet || activeWalletStore;

  // Lắng nghe Realtime Broadcast & Polling On-chain liên tục
  useNotificationRealtime(activeWallet);

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
