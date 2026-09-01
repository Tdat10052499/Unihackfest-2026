import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';

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

  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const latestLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);

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

  // 1. Xin quyền và theo dõi tọa độ định kỳ (watchPositionAsync)
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
    } catch (e) {
      console.warn('Không thể làm mới vị trí:', e);
    }
  };

  // 2. Hàm phát sóng lời mời tham gia phòng giao dịch (Chuẩn bị kết nối Anchor Program PDA)
  const broadcastInvite = async (
    _roomId: string,
    _targetUserIds: string[],
    _options?: BroadcastInviteOptions
  ): Promise<boolean> => {
    console.log('📡 [Broadcast Invite] Sẵn sàng chuyển giao sang Anchor On-chain Event.');
    return true;
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
