import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useNotificationStore } from '../stores/useNotificationStore';

/**
 * Đồng bộ thông báo từ lịch sử on-chain (Helius RPC) theo chu kỳ 8s
 * để phát hiện giao dịch nhận tiền từ mọi nguồn.
 * TODO(Phase 1): thay polling bằng Helius WebSocket (accountSubscribe/logsSubscribe trên ATA USDC).
 */
export function useNotificationSync(walletAddress?: string | null) {
  const { loadNotifications } = useNotificationStore();
  const syncIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (!walletAddress) return;

    // 1. Tải danh sách thông báo đã lưu của ví
    loadNotifications(walletAddress, true);

    // 2. Chu kỳ tự động kiểm tra on-chain (8s) phòng trường hợp chuyển tiền từ bên ngoài/faucet
    syncIntervalRef.current = setInterval(() => {
      loadNotifications(walletAddress, true);
    }, 8000);

    // 3. Lắng nghe khi App quay lại từ Background
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
