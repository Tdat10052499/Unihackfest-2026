import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { getSupabaseClient } from '../services/supabase';
import { useNotificationStore, InAppNotification } from '../stores/useNotificationStore';

/**
 * Hook lắng nghe thông báo Realtime từ kênh Supabase Realtime Broadcast
 * Kênh: notifications_${walletAddress}
 * Sự kiện: NEW_NOTIFICATION
 * Kèm luồng Auto-Sync On-chain chu kỳ 8s để phát hiện giao dịch nhận tiền từ mọi nguồn
 */
export function useNotificationRealtime(walletAddress?: string | null) {
  const { addNotification, loadNotifications } = useNotificationStore();
  const channelRef = useRef<any>(null);
  const syncIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (!walletAddress) return;

    // 1. Tải danh sách thông báo đã lưu của ví
    loadNotifications(walletAddress, true);

    // 2. Thiết lập kênh Supabase Realtime Broadcast
    const supabase = getSupabaseClient();
    const cleanAddress = walletAddress.toLowerCase();
    const channelName = `notifications_${cleanAddress}`;

    try {
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: true },
        },
      });

      channel
        .on('broadcast', { event: 'NEW_NOTIFICATION' }, (eventData: any) => {
          console.log('🔔 [useNotificationRealtime] Nhận broadcast thông báo mới:', eventData);
          if (eventData?.payload) {
            const data = eventData.payload as Partial<InAppNotification>;
            addNotification({
              type: data.type || 'RECEIVE_MONEY',
              title: data.title || 'Thông báo mới',
              message: data.message || '',
              amount: data.amount,
              currency: data.currency || 'USDC',
              txHash: data.txHash,
              sender: data.sender,
              senderName: data.senderName,
              senderPhone: data.senderPhone,
              senderWallet: data.senderWallet,
              recipientName: data.recipientName,
              recipientPhone: data.recipientPhone,
              recipientWallet: data.recipientWallet,
              senderNote: data.senderNote,
              network: data.network,
              fee: data.fee,
            });
          }
        })
        .subscribe((status: string) => {
          console.log(`📡 [useNotificationRealtime] Trạng thái đăng ký kênh ${channelName}:`, status);
        });

      channelRef.current = channel;
    } catch (err) {
      console.warn('⚠️ [useNotificationRealtime] Lỗi thiết lập kênh Realtime:', err);
    }

    // 3. Chu kỳ tự động kiểm tra on-chain (8s) phòng trường hợp chuyển tiền từ bên ngoài/faucet
    syncIntervalRef.current = setInterval(() => {
      loadNotifications(walletAddress, true);
    }, 8000);

    // 4. Lắng nghe khi App quay lại từ Background
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

      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
          supabase.removeChannel(channelRef.current);
        } catch (e) {
          console.warn('⚠️ [useNotificationRealtime] Lỗi cleanup kênh:', e);
        }
        channelRef.current = null;
      }
    };
  }, [walletAddress]);
}
