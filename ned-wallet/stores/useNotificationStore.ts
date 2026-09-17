import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchOnChainHistory, ActivityItem } from '../services/solana';

export type NotificationType = 'RECEIVE_MONEY' | 'TRANSFER' | 'SYSTEM' | 'WARNING';

export interface InAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  amount?: string | number;
  currency?: string; // USDC, SOL, PYUSD...
  isRead: boolean;
  createdAt: number; // timestamp in ms
  txHash?: string;
  sender?: string;
  senderNote?: string;
  senderWallet?: string; // Địa chỉ ví người gửi
  recipientWallet?: string; // Địa chỉ ví nhận (ví gửi đến)
  network?: string; // Mạng lưới (Solana Devnet / Mainnet)
  fee?: string; // Phí mạng
  blockNumber?: number | string; // Số khối / Slot
}

interface NotificationState {
  notifications: InAppNotification[];
  unreadCount: number;
  activeNotification: InAppNotification | null;
  bannerNotification: InAppNotification | null;
  activeWalletAddress: string | null;

  loadNotifications: (walletAddress: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (
    payload: Omit<InAppNotification, 'id' | 'createdAt' | 'isRead'> & {
      id?: string;
      createdAt?: number;
      isRead?: boolean;
    }
  ) => Promise<InAppNotification>;
  setActiveNotification: (notification: InAppNotification | null) => void;
  triggerBanner: (notification: InAppNotification) => void;
  dismissBanner: () => void;
  clearAll: () => Promise<void>;
}

const STORAGE_PREFIX = 'ned_notifications_';
const READ_PREFIX = 'ned_read_notifications_';

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  activeNotification: null,
  bannerNotification: null,
  activeWalletAddress: null,

  loadNotifications: async (walletAddress: string) => {
    if (!walletAddress) return;
    try {
      const cleanAddress = walletAddress.toLowerCase();
      const storageKey = `${STORAGE_PREFIX}${cleanAddress}`;
      const readKey = `${READ_PREFIX}${cleanAddress}`;

      const [saved, savedReadIds] = await Promise.all([
        AsyncStorage.getItem(storageKey),
        AsyncStorage.getItem(readKey),
      ]);

      // 1. Lọc bỏ toàn bộ mock data cũ (nếu có các id bắt đầu bằng seed-notif-)
      let localList: InAppNotification[] = [];
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            localList = parsed.filter(
              (item) => item && typeof item.id === 'string' && !item.id.startsWith('seed-notif-')
            );
          }
        } catch (e) {
          localList = [];
        }
      }

      let readIds: string[] = [];
      if (savedReadIds) {
        try {
          readIds = JSON.parse(savedReadIds) || [];
        } catch (e) {
          readIds = [];
        }
      }

      // 2. Kéo dữ liệu giao dịch On-Chain THỰC TẾ của ví từ Solana RPC
      let onChainNotifications: InAppNotification[] = [];
      try {
        const onChainHistory: ActivityItem[] = await fetchOnChainHistory(walletAddress);
        if (onChainHistory && onChainHistory.length > 0) {
          onChainNotifications = onChainHistory
            .filter((tx) => {
              if (!tx || tx.isNetworkFee === true || tx.type === 'GAS_FEE') return false;
              const cleanAmount = Math.abs(parseFloat(tx.amount.replace(/[^0-9.-]+/g, '')) || 0);
              return cleanAmount >= 0.01;
            })
            .map((tx) => {
              const cleanAmount = Math.abs(parseFloat(tx.amount.replace(/[^0-9.-]+/g, '')) || 0);
              const txId = tx.signature || tx.id;
              const isRead = readIds.includes(txId);
              const isReceive = tx.isPositive;

              return {
                id: txId,
                type: (isReceive ? 'RECEIVE_MONEY' : 'TRANSFER') as NotificationType,
                title: isReceive ? 'Nhận tiền thành công' : 'Chuyển tiền thành công',
                message: isReceive
                  ? `Bạn đã nhận được ${tx.amount} vào ví.`
                  : `Bạn đã chuyển ${tx.amount} thành công.`,
                amount: cleanAmount,
                currency: 'USDC',
                isRead,
                createdAt: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
                txHash: tx.signature,
                sender: isReceive ? 'Ví người gửi trên Solana' : 'Bạn',
                senderWallet: isReceive ? 'Ví đối tác trên Solana' : walletAddress,
                recipientWallet: isReceive ? walletAddress : 'Ví người nhận trên Solana',
                network: 'Solana Devnet',
                fee: '0.000005 SOL (~$0.0007)',
              };
            });
        }
      } catch (err) {
        console.warn('⚠️ [useNotificationStore] Không thể kéo on-chain history:', err);
      }

      // 3. Hợp nhất thông báo giao dịch trong app và on-chain, khử trùng lặp theo txHash/id
      const seen = new Set<string>();
      const combined: InAppNotification[] = [];

      for (const item of [...localList, ...onChainNotifications]) {
        const key = item.txHash || item.id;
        if (!seen.has(key)) {
          seen.add(key);
          const isItemRead =
            item.isRead ||
            readIds.includes(item.id) ||
            (item.txHash ? readIds.includes(item.txHash) : false);
          combined.push({ ...item, isRead: isItemRead });
        }
      }

      // Sắp xếp thời gian giảm dần (mới nhất lên đầu)
      combined.sort((a, b) => b.createdAt - a.createdAt);
      const unreadCount = combined.filter((n) => !n.isRead).length;

      set({
        notifications: combined,
        unreadCount,
        activeWalletAddress: walletAddress,
      });

      // Lưu lại danh sách dữ liệu thật vào storage
      await AsyncStorage.setItem(storageKey, JSON.stringify(combined));
    } catch (err) {
      console.error('⚠️ [useNotificationStore] Lỗi khi load thông báo:', err);
    }
  },

  markAsRead: async (id: string) => {
    const { notifications, activeWalletAddress } = get();
    const updated = notifications.map((n) =>
      n.id === id || n.txHash === id ? { ...n, isRead: true } : n
    );
    const unreadCount = updated.filter((n) => !n.isRead).length;

    set({ notifications: updated, unreadCount });

    if (activeWalletAddress) {
      const cleanAddress = activeWalletAddress.toLowerCase();
      const storageKey = `${STORAGE_PREFIX}${cleanAddress}`;
      const readKey = `${READ_PREFIX}${cleanAddress}`;

      AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch(console.error);

      try {
        const savedReadIds = await AsyncStorage.getItem(readKey);
        const readIds: string[] = savedReadIds ? JSON.parse(savedReadIds) : [];
        if (!readIds.includes(id)) {
          readIds.push(id);
          await AsyncStorage.setItem(readKey, JSON.stringify(readIds));
        }
      } catch (e) {
        console.error(e);
      }
    }
  },

  markAllAsRead: async () => {
    const { notifications, activeWalletAddress } = get();
    const updated = notifications.map((n) => ({ ...n, isRead: true }));

    set({ notifications: updated, unreadCount: 0 });

    if (activeWalletAddress) {
      const cleanAddress = activeWalletAddress.toLowerCase();
      const storageKey = `${STORAGE_PREFIX}${cleanAddress}`;
      const readKey = `${READ_PREFIX}${cleanAddress}`;

      AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch(console.error);

      const allIds = updated.map((n) => n.id);
      AsyncStorage.setItem(readKey, JSON.stringify(allIds)).catch(console.error);
    }
  },

  addNotification: async (payload) => {
    const { notifications, activeWalletAddress } = get();
    const newNotif: InAppNotification = {
      id: payload.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      amount: payload.amount,
      currency: payload.currency || 'USDC',
      isRead: payload.isRead ?? false,
      createdAt: payload.createdAt || Date.now(),
      txHash: payload.txHash,
      sender: payload.sender,
      senderNote: payload.senderNote,
      senderWallet: payload.senderWallet,
      recipientWallet: payload.recipientWallet,
      network: payload.network || 'Solana Devnet',
      fee: payload.fee || '0.000005 SOL',
      blockNumber: payload.blockNumber,
    };

    const updated = [newNotif, ...notifications];
    const unreadCount = updated.filter((n) => !n.isRead).length;

    set({
      notifications: updated,
      unreadCount,
      bannerNotification: newNotif, // Kích hoạt top in-app banner
    });

    if (activeWalletAddress) {
      const cleanAddress = activeWalletAddress.toLowerCase();
      const storageKey = `${STORAGE_PREFIX}${cleanAddress}`;
      AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch(console.error);
    }

    return newNotif;
  },

  setActiveNotification: (notification) => {
    set({ activeNotification: notification });
  },

  triggerBanner: (notification) => {
    set({ bannerNotification: notification });
  },

  dismissBanner: () => {
    set({ bannerNotification: null });
  },

  clearAll: async () => {
    const { activeWalletAddress } = get();
    set({ notifications: [], unreadCount: 0, activeNotification: null });

    if (activeWalletAddress) {
      const cleanAddress = activeWalletAddress.toLowerCase();
      const storageKey = `${STORAGE_PREFIX}${cleanAddress}`;
      const readKey = `${READ_PREFIX}${cleanAddress}`;
      AsyncStorage.removeItem(storageKey).catch(console.error);
      AsyncStorage.removeItem(readKey).catch(console.error);
    }
  },
}));
