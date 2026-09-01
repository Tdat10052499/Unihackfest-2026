import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { supabase } from '@/services/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceUser {
  user_id: string;
  name: string;
  avatar: string;
  lat: number;
  lng: number;
  wallet_address?: string;
  updated_at?: string;
  distanceMeters?: number;
}

export interface BroadcastInviteOptions {
  totalBill?: number;
  splitAmount?: number;
  note?: string;
  roomType?: 'shake' | 'coin_toss';
}

interface GlobalPresenceContextType {
  location: { latitude: number; longitude: number } | null;
  hasLocationPermission: boolean;
  isTracking: boolean;
  nearbyUsers: PresenceUser[];
  currentUserProfile: { name: string; avatar: string };
  refreshLocation: () => Promise<void>;
  broadcastInvite: (
    roomId: string,
    targetUserIds: string[],
    options?: BroadcastInviteOptions
  ) => Promise<boolean>;
}

const GlobalPresenceContext = createContext<GlobalPresenceContextType>({
  location: null,
  hasLocationPermission: false,
  isTracking: false,
  nearbyUsers: [],
  currentUserProfile: { name: 'Đạt Tuấn', avatar: 'Đ' },
  refreshLocation: async () => {},
  broadcastInvite: async () => false,
});

export const useGlobalPresence = () => useContext(GlobalPresenceContext);

// Hàm tính khoảng cách giữa 2 tọa độ (Haversine formula - theo mét)
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Bán kính Trái Đất (mét)
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export const GlobalPresenceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();

  const { user } = usePrivy();
  const solanaWalletState = useEmbeddedSolanaWallet();
  const userId = user?.id || null;

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState<PresenceUser[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const latestLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastTrackedRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  // Lấy địa chỉ ví Solana
  const getSolanaAddress = (): string | null => {
    if (!user) return null;
    if (solanaWalletState?.wallets && solanaWalletState.wallets.length > 0) {
      const solWallet = solanaWalletState.wallets[0];
      if (solWallet?.address) return solWallet.address;
    }
    const linkedAccounts = (user as any)?.linked_accounts || (user as any)?.linkedAccounts || [];
    const solanaAccount = linkedAccounts.find(
      (acc: any) => acc.type === 'wallet' && (acc.chain_type === 'solana' || acc.chainType === 'solana')
    );
    return solanaAccount?.address || null;
  };

  // Lấy tên hiển thị & avatar người dùng
  const getUserProfile = () => {
    if (!user) return { name: 'Đạt Tuấn', avatar: 'Đ' };
    const googleAcc =
      (user as any)?.google ||
      (user as any)?.linked_accounts?.find((a: any) => a.type === 'google_oauth' || a.type === 'google');
    const emailAcc = (user as any)?.email;

    const name =
      googleAcc?.name ||
      (googleAcc?.email ? googleAcc.email.split('@')[0] : null) ||
      (emailAcc?.address ? emailAcc.address.split('@')[0] : 'Đạt Tuấn');

    const avatar = name.charAt(0).toUpperCase();
    return { name, avatar };
  };

  // Hàm đẩy tọa độ và định danh lên Supabase Presence với cơ chế Throttle chống spam
  const trackPresence = (lat: number, lng: number, force: boolean = false) => {
    if (!channelRef.current || !userId || !user) return;

    const now = Date.now();
    if (!force && lastTrackedRef.current) {
      const dist = calculateDistanceMeters(
        lastTrackedRef.current.lat,
        lastTrackedRef.current.lng,
        lat,
        lng
      );
      const elapsed = now - lastTrackedRef.current.time;
      // Chỉ gửi update nếu di chuyển > 10m HOẶC đã quá 45s kể từ lần gửi cuối
      if (dist < 10 && elapsed < 45000) {
        return;
      }
    }

    lastTrackedRef.current = { lat, lng, time: now };

    const { name, avatar } = getUserProfile();
    const solanaAddress = getSolanaAddress();

    const payload: PresenceUser = {
      user_id: userId,
      name,
      avatar,
      lat,
      lng,
      wallet_address: solanaAddress || undefined,
    };

    channelRef.current
      .track(payload)
      .then((status) => {
        console.log('🛰️ [Supabase Realtime] Presence tracked:', {
          status,
          user_id: userId,
          name,
          lat: lat.toFixed(5),
          lng: lng.toFixed(5),
        });
      })
      .catch((err) => {
        console.warn('⚠️ [Supabase Realtime] Error tracking presence:', err);
      });
  };

  // 1. Khởi tạo kết nối Supabase Presence Channel 'global_radar' (Chỉ khởi tạo 1 lần theo userId)
  useEffect(() => {
    if (!userId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setNearbyUsers([]);
      return;
    }

    console.log('🔌 [Supabase Realtime] Khởi tạo kết nối channel: global_radar');
    const channel = supabase.channel('global_radar', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>();
        const currentLoc = latestLocationRef.current;
        const usersList: PresenceUser[] = [];

        Object.keys(state).forEach((key) => {
          const presences = state[key];
          if (presences && presences.length > 0) {
            const p = presences[presences.length - 1];
            // Bỏ qua chính bản thân
            if (p.user_id !== userId && p.lat && p.lng) {
              let distMeters: number | undefined;
              if (currentLoc) {
                distMeters = calculateDistanceMeters(
                  currentLoc.latitude,
                  currentLoc.longitude,
                  p.lat,
                  p.lng
                );
              }
              usersList.push({
                ...p,
                distanceMeters: distMeters,
              });
            }
          }
        });

        setNearbyUsers(usersList);
      })
      .on('broadcast', { event: 'room_invite' }, ({ payload }) => {
        console.log('📥 [Supabase Broadcast] Nhận sự kiện room_invite:', payload);
        const hostName = payload?.host_name || 'Một người bạn';
        const isCoinToss = payload?.room_type === 'coin_toss';

        if (
          userId &&
          payload?.target_user_ids?.includes(userId) &&
          payload?.host_id !== userId
        ) {
          if (isCoinToss) {
            Alert.alert(
              '🪙 Lì Xì Tung Đồng Xu',
              `${hostName} đang mời bạn vào phòng Lì Xì Tung Đồng Xu may mắn!`,
              [
                {
                  text: 'Từ chối',
                  style: 'cancel',
                },
                {
                  text: 'Vào phòng ngay',
                  onPress: () => {
                    console.log('🚀 [Guest] Vào phòng Coin Toss:', payload.room_id);
                    router.push(
                      `/coin-toss-room?roomId=${payload.room_id}&hostId=${payload.host_id}&hostName=${encodeURIComponent(
                        payload.host_name || ''
                      )}` as any
                    );
                  },
                },
              ]
            );
          } else {
            const splitAmountStr = payload?.split_amount
              ? ` ($${payload.split_amount} USD)`
              : '';
            Alert.alert(
              '🔔 Lời Mời Chia Tiền',
              `${hostName} muốn chia hóa đơn cùng bạn${splitAmountStr}`,
              [
                {
                  text: 'Từ chối',
                  style: 'cancel',
                },
                {
                  text: 'Tham gia',
                  onPress: () => {
                    console.log('🚀 [Guest] Chấp nhận lời mời, chuyển sang phòng:', payload.room_id);
                    router.push(
                      `/shake-room?roomId=${payload.room_id}&hostId=${payload.host_id}&hostName=${encodeURIComponent(
                        payload.host_name || ''
                      )}&hostWallet=${encodeURIComponent(
                        payload.host_wallet || ''
                      )}&totalBill=${payload.total_bill || 0}&splitAmount=${payload.split_amount || 0}&note=${encodeURIComponent(
                        payload.note || ''
                      )}` as any
                    );
                  },
                },
              ]
            );
          }
        }
      })
      .subscribe((status) => {
        console.log('📡 [Supabase Realtime] Trạng thái đăng ký channel global_radar:', status);
        if (status === 'SUBSCRIBED' && latestLocationRef.current) {
          trackPresence(
            latestLocationRef.current.latitude,
            latestLocationRef.current.longitude,
            true
          );
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('🧹 [Supabase Realtime] Dọn dẹp channel global_radar');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  // 2. Xin quyền và theo dõi tọa độ định kỳ (watchPositionAsync nhẹ nhàng)
  useEffect(() => {
    let isMounted = true;

    const startLocationTracking = async () => {
      try {
        console.log('📍 [Location] Đang yêu cầu quyền truy cập vị trí...');
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          console.log('⚠️ [Location] Người dùng đã từ chối cấp quyền vị trí.');
          if (isMounted) setHasLocationPermission(false);
          return;
        }

        if (isMounted) {
          setHasLocationPermission(true);
          setIsTracking(true);
        }

        // Lấy tọa độ tức thì ban đầu
        try {
          const currentPos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const initCoords = {
            latitude: currentPos.coords.latitude,
            longitude: currentPos.coords.longitude,
          };
          if (isMounted) {
            setLocation(initCoords);
            latestLocationRef.current = initCoords;
            trackPresence(initCoords.latitude, initCoords.longitude, true);
          }
        } catch (initErr) {
          console.warn('⚠️ [Location] Không lấy được tọa độ tức thời ban đầu:', initErr);
        }

        // Theo dõi với khoảng cách >= 10m, thời gian >= 15s để không gây nghẽn bridge
        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 10,
            timeInterval: 15000,
          },
          (loc) => {
            if (!isMounted) return;
            const newCoords = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
            setLocation(newCoords);
            latestLocationRef.current = newCoords;
            trackPresence(newCoords.latitude, newCoords.longitude, false);
          }
        );

        locationSubRef.current = sub;
      } catch (err) {
        console.error('❌ [Location] Lỗi khi theo dõi vị trí:', err);
      }
    };

    if (userId) {
      startLocationTracking();
    }

    return () => {
      isMounted = false;
      if (locationSubRef.current) {
        console.log('🧹 [Location] Hủy theo dõi vị trí');
        locationSubRef.current.remove();
        locationSubRef.current = null;
      }
      setIsTracking(false);
    };
  }, [userId]);

  const refreshLocation = async () => {
    try {
      if (!hasLocationPermission) return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setLocation(coords);
      latestLocationRef.current = coords;
      trackPresence(coords.latitude, coords.longitude, true);
    } catch (e) {
      console.warn('Không thể làm mới vị trí:', e);
    }
  };

  // 3. Hàm phát sóng lời mời tham gia phòng giao dịch
  const broadcastInvite = async (
    roomId: string,
    targetUserIds: string[],
    options?: BroadcastInviteOptions
  ): Promise<boolean> => {
    if (!channelRef.current || !userId || !user) {
      console.warn('⚠️ [Supabase Broadcast] Không có kết nối channel để gửi broadcast invite');
      return false;
    }

    const { name, avatar } = getUserProfile();
    const solanaAddress = getSolanaAddress();

    try {
      const payload = {
        room_id: roomId,
        host_id: userId,
        host_name: name,
        host_avatar: avatar,
        host_wallet: solanaAddress || undefined,
        target_user_ids: targetUserIds,
        room_type: options?.roomType || 'shake',
        total_bill: options?.totalBill,
        split_amount: options?.splitAmount,
        note: options?.note,
      };

      console.log('📡 [Supabase Broadcast] Bắn sự kiện room_invite:', payload);

      await channelRef.current.send({
        type: 'broadcast',
        event: 'room_invite',
        payload,
      });

      console.log('✅ [Supabase Broadcast] Phát sóng room_invite thành công!');
      return true;
    } catch (err) {
      console.error('❌ [Supabase Broadcast] Lỗi khi phát sóng room_invite:', err);
      return false;
    }
  };

  const contextValue = React.useMemo(
    () => ({
      location,
      hasLocationPermission,
      isTracking,
      nearbyUsers,
      currentUserProfile: getUserProfile(),
      refreshLocation,
      broadcastInvite,
    }),
    [location, hasLocationPermission, isTracking, nearbyUsers, user]
  );

  return (
    <GlobalPresenceContext.Provider value={contextValue}>
      {children}
    </GlobalPresenceContext.Provider>
  );
};
