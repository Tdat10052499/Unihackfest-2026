import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from './supabase';
import { InAppNotification } from '../stores/useNotificationStore';

export interface TransferNotificationPayload {
  recipientWallet: string;
  senderWallet?: string;
  amount: number;
  currency?: string;
  txHash: string;
  senderName?: string;
  senderPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  senderNote?: string;
}

const STORAGE_PREFIX = 'ned_notifications_';

/**
 * Phát broadcast thông báo nhận tiền trực tiếp đến ví người nhận qua Supabase Realtime
 * Đồng thời cập nhật vào local AsyncStorage của ví nhận nếu người dùng test trên cùng thiết bị
 */
export async function broadcastTransferNotification(params: TransferNotificationPayload): Promise<void> {
  const { recipientWallet, amount, currency = 'USDC', txHash } = params;
  if (!recipientWallet) return;

  const cleanRecipient = recipientWallet.trim().toLowerCase();
  const notifId = txHash || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const notificationPayload: InAppNotification = {
    id: notifId,
    type: 'RECEIVE_MONEY',
    title: 'Nhận tiền thành công',
    message: `Bạn đã nhận được +$${amount.toFixed(2)} ${currency} từ ${params.senderName || 'đối tác'}.`,
    amount,
    currency,
    isRead: false,
    createdAt: Date.now(),
    txHash,
    sender: params.senderName || 'Ví người gửi trên Solana',
    senderName: params.senderName,
    senderPhone: params.senderPhone,
    senderWallet: params.senderWallet,
    recipientName: params.recipientName,
    recipientPhone: params.recipientPhone,
    recipientWallet,
    senderNote: params.senderNote || `Nhận từ: ${params.senderName || 'đối tác'}`,
    network: 'Solana Devnet',
    fee: '0.000005 SOL',
  };

  // 1. Gửi qua Supabase Realtime Broadcast đến kênh của ví người nhận
  try {
    const supabase = getSupabaseClient();
    const channelName = `notifications_${cleanRecipient}`;
    console.log(`📡 [broadcastTransferNotification] Đang kết nối kênh ${channelName}...`);

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
      },
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`📡 [broadcastTransferNotification] Kênh ${channelName} đã sẵn sàng, đang gửi broadcast...`);
        channel
          .send({
            type: 'broadcast',
            event: 'NEW_NOTIFICATION',
            payload: notificationPayload,
          })
          .then(() => {
            console.log(`✅ [broadcastTransferNotification] Đã gửi thông báo thành công tới ví: ${cleanRecipient}`);
            setTimeout(() => {
              supabase.removeChannel(channel);
            }, 2000);
          })
          .catch((sendErr) => {
            console.warn('⚠️ [broadcastTransferNotification] Lỗi send broadcast:', sendErr);
          });
      }
    });
  } catch (realtimeErr) {
    console.warn('⚠️ [broadcastTransferNotification] Lỗi khởi tạo Supabase channel:', realtimeErr);
  }

  // 2. Nếu người nhận cũng từng lưu dữ liệu trên thiết bị này (test multi-account), cập nhật trực tiếp vào AsyncStorage
  try {
    const recipientStorageKey = `${STORAGE_PREFIX}${cleanRecipient}`;
    const rawSaved = await AsyncStorage.getItem(recipientStorageKey);
    let list: InAppNotification[] = [];
    if (rawSaved) {
      try {
        list = JSON.parse(rawSaved) || [];
      } catch {
        list = [];
      }
    }
    const exists = list.some((item) => (item.txHash && item.txHash === txHash) || item.id === notifId);
    if (!exists) {
      const updated = [notificationPayload, ...list];
      await AsyncStorage.setItem(recipientStorageKey, JSON.stringify(updated));
      console.log(`💾 [broadcastTransferNotification] Đã lưu thông báo vào local cache của ví nhận: ${cleanRecipient}`);
    }
  } catch (storageErr) {
    console.warn('⚠️ [broadcastTransferNotification] Lỗi lưu cache local của ví nhận:', storageErr);
  }
}
