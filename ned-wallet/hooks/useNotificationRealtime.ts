import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '../services/supabase';
import { useNotificationStore, InAppNotification } from '../stores/useNotificationStore';

/**
 * Hook lắng nghe thông báo Realtime từ kênh Supabase Realtime Broadcast
 * Kênh: notifications_${walletAddress}
 * Sự kiện: NEW_NOTIFICATION
 */
export function useNotificationRealtime(walletAddress?: string | null) {
  const { addNotification, loadNotifications } = useNotificationStore();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!walletAddress) return;

    // Tải danh sách thông báo đã lưu của ví
    loadNotifications(walletAddress);

    const supabase = getSupabaseClient();
    const cleanAddress = walletAddress.toLowerCase();
    const channelName = `notifications_${cleanAddress}`;

    try {
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
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
              senderNote: data.senderNote,
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

    return () => {
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
