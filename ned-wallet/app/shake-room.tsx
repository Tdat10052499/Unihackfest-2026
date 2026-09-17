import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Animated,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Share,
  Image,
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Accelerometer } from 'expo-sensors';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { cacheActivities, getCachedActivities } from '@/services/storage';
import { ActivityItem, formatFiatBalance, USD_TO_VND_RATE } from '@/services/solana';
import { supabase } from '@/services/supabase';
import { useGlobalPresence } from '@/contexts/GlobalPresenceContext';
import { useOnchainTransfer } from '@/hooks/useOnchainTransfer';
import { WalletRecoveryModal } from '../components/WalletRecoveryModal';
import { TransactionReceiptModal } from '../components/TransactionReceiptModal';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useUserStore } from '@/stores/useUserStore';
import { broadcastTransferNotification } from '@/services/notificationService';
import { AirDropUserIcon } from '@/components/AirDropUserIcon';
import type { PresenceUser } from '@/contexts/GlobalPresenceContext';

// Tỷ giá quy đổi giả định: 1 SOL = $150 USD
const SOL_USD_RATE = 150;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Tạo đường dẫn SVG cho cuống vé thanh toán của Guest
 * Mép trên bo tròn mềm mại, mép dưới răng cưa ziczac
 */
function getGuestTicketPath(
  width: number,
  height: number,
  cornerRadius: number = 24,
  toothWidth: number = 14,
  toothHeight: number = 8
): string {
  if (width <= 0 || height <= 0) return '';
  const numTeeth = Math.max(1, Math.round(width / toothWidth));
  const tw = width / numTeeth;

  let d = `M 0 ${cornerRadius} `;
  d += `A ${cornerRadius} ${cornerRadius} 0 0 1 ${cornerRadius} 0 `;
  d += `L ${width - cornerRadius} 0 `;
  d += `A ${cornerRadius} ${cornerRadius} 0 0 1 ${width} ${cornerRadius} `;
  d += `L ${width} ${height - toothHeight} `;
  for (let i = numTeeth - 1; i >= 0; i--) {
    const xMid = (i + 0.5) * tw;
    const xStart = i * tw;
    d += `L ${xMid} ${height} L ${xStart} ${height - toothHeight} `;
  }
  d += `L 0 ${height - toothHeight} Z`;

  return d;
}

/**
 * 🎨 Component NeoCard: Tạo Thẻ viền đen đậm với Bóng đổ cứng (Hard Shadow)
 * Chuẩn Neo-brutalism 0 blur trên cả Android, iOS & Web.
 */
interface NeoCardProps {
  children: React.ReactNode;
  shadowColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  offset?: number;
  style?: any;
  containerStyle?: any;
}

const NeoCard: React.FC<NeoCardProps> = ({
  children,
  shadowColor = '#000000',
  backgroundColor = '#FDF8F0',
  borderColor = '#000000',
  borderWidth = 2.5,
  borderRadius = 24,
  offset = 4,
  style,
  containerStyle,
}) => {
  return (
    <View style={[{ position: 'relative' }, containerStyle]}>
      {/* Hard Shadow Layer */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: shadowColor,
            borderRadius,
            top: offset,
            left: offset,
          },
        ]}
      />
      {/* Main Card Layer */}
      <View
        style={[
          {
            backgroundColor,
            borderColor,
            borderWidth,
            borderRadius,
            padding: 18,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

/**
 * 💈 Component StripedProgressBar:
 * Thanh loading dạng kẹo sọc (barber-pole / candy-cane) chuyển động mượt mà
 * Màu tím (#8A5BE8) và xanh mint (#C4F1F9) theo đúng thiết kế Neo-brutalism
 */
const StripedProgressBar: React.FC = () => {
  const stripeOffset = useSharedValue(0);

  React.useEffect(() => {
    stripeOffset.value = withRepeat(
      withTiming(-24, { duration: 800, easing: Easing.linear }),
      -1,
      false
    );
    return () => {
      cancelAnimation(stripeOffset);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: stripeOffset.value }],
  }));

  const numCycles = 18;
  const cycleW = 24;

  return (
    <View style={styles.stripedBarBorder}>
      <View style={styles.stripedBarInner}>
        <Reanimated.View
          style={[
            {
              flexDirection: 'row',
              width: numCycles * cycleW,
              height: 24,
            },
            animatedStyle,
          ]}
        >
          <Svg width={numCycles * cycleW} height={24}>
            {Array.from({ length: numCycles }).map((_, idx) => {
              const i = idx - 2;
              const x = i * cycleW;
              const dPurple = `M ${x + 10} 0 L ${x + 22} 0 L ${x + 12} 24 L ${x} 24 Z`;
              const dCyan = `M ${x + 22} 0 L ${x + 34} 0 L ${x + 24} 24 L ${x + 12} 24 Z`;

              return (
                <React.Fragment key={idx}>
                  <Path d={dPurple} fill="#8A5BE8" stroke="#000000" strokeWidth={1.2} />
                  <Path d={dCyan} fill="#C4F1F9" stroke="#000000" strokeWidth={1.2} />
                </React.Fragment>
              );
            })}
          </Svg>
        </Reanimated.View>
      </View>
    </View>
  );
};

/**
 * 🖼️ Component WalletUserAvatar:
 * Hiển thị avatar tròn đúng theo thông tin ví (ảnh avatar nếu có, hoặc icon AirDrop silhouette)
 */
interface WalletUserAvatarProps {
  avatarUrl?: string | null;
  avatarLetter?: string;
  name?: string;
  size?: number;
}

const WalletUserAvatar: React.FC<WalletUserAvatarProps> = ({
  avatarUrl,
  avatarLetter,
  name,
  size = 56,
}) => {
  const isImage = Boolean(
    avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('data:image'))
  );

  if (isImage) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: '#E2E8F0',
          borderWidth: 1.8,
          borderColor: '#000000',
        }}
      >
        <Image
          source={{ uri: avatarUrl! }}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        borderWidth: 1.8,
        borderColor: '#000000',
      }}
    >
      <AirDropUserIcon size={size} id={`avatar_${name || 'user'}_${size}`} />
    </View>
  );
};

interface RoomMember {
  user_id: string;
  name: string;
  avatar: string;
  avatar_url?: string | null;
  wallet_address?: string;
  isHost: boolean;
  status: 'pending' | 'paid';
  tx_signature?: string;
}

export default function ShakeRoomScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{
    roomId: string;
    isHost?: string;
    hostId?: string;
    hostName?: string;
    hostWallet?: string;
    totalBill?: string;
    splitAmount?: string;
    note?: string;
  }>();

  const { roomId, hostId, hostName } = searchParams;
  const { user, isReady, logout } = usePrivy();
  const solanaWalletState = useEmbeddedSolanaWallet();
  const {
    transfer: executeTokenTransfer,
    isTransferring: isExecutingTransfer,
    statusMessage: transferStatusMessage,
    isWalletReady,
    needsRecovery,
    walletStatus,
  } = useOnchainTransfer();

  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    amount: number | string;
    currency?: string;
    note?: string;
    txHash?: string;
  }>({ amount: 10, currency: 'USD', note: 'Group lunch' });
  const { nearbyUsers, broadcastInvite, currentUserProfile } = useGlobalPresence();

  // Xác định vai trò: Host hay Guest
  const isHost =
    searchParams.isHost === 'false'
      ? false
      : searchParams.isHost === 'true'
        ? true
        : Boolean(!hostId || (user?.id && hostId && user.id === hostId));

  // Lưu địa chỉ ví On-chain của Host
  const [hostWalletAddress, setHostWalletAddress] = useState<string>(
    searchParams.hostWallet ? decodeURIComponent(searchParams.hostWallet) : ''
  );

  // Host Phases: 'SETUP' (Nhập tiền & Quét/Lắc) | 'WAITING' (Quản lý chờ thành viên thanh toán)
  const [hostPhase, setHostPhase] = useState<'SETUP' | 'WAITING'>('SETUP');

  // Guest Phases: 'WAITING_FOR_HOST' (Chờ Host lắc và chốt hóa đơn) | 'READY_TO_PAY' (Đã nhận trigger chia tiền)
  const [guestPhase, setGuestPhase] = useState<'WAITING_FOR_HOST' | 'READY_TO_PAY'>('WAITING_FOR_HOST');

  // State Hóa đơn (Định dạng Dollar USD theo yêu cầu: TextInput tự do, không nút cố định)
  const [totalBill, setTotalBill] = useState(searchParams.totalBill || '100');
  const [splitAmount, setSplitAmount] = useState(searchParams.splitAmount || '0');
  const [billNote, setBillNote] = useState(
    searchParams.note ? decodeURIComponent(searchParams.note) : 'Group Lunch'
  );

  // State Thành viên phòng
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [isInvitingNearby, setIsInvitingNearby] = useState(false);
  const [invitedStatusMap, setInvitedStatusMap] = useState<{
    [userId: string]: 'inviting' | 'invited' | 'rejected' | 'joined';
  }>({});

  const currentUserStateAvatarUrl = useUserStore((s) => s.avatarUrl);

  // State Thanh toán phía Guest & Nhận tiền phía Host
  const [isGuestPaying, setIsGuestPaying] = useState(false);
  const [hasGuestPaid, setHasGuestPaid] = useState(false);
  const [isHostClaiming, setIsHostClaiming] = useState(false);

  // Refs & Animations
  const accelerometerSubRef = useRef<any>(null);
  const lastShakeTimeRef = useRef(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarWaveAnim = useRef(new Animated.Value(1)).current;
  const radarRotateAnim = useRef(new Animated.Value(0)).current;


  // Lấy địa chỉ ví Solana On-chain (Base58)
  const getSolanaAddress = (): string | null => {
    if (!user) return null;
    if (solanaWalletState?.wallets && solanaWalletState.wallets.length > 0) {
      const solWallet = solanaWalletState.wallets[0];
      if (solWallet?.address) return solWallet.address;
    }
    const linkedAccounts =
      (user as any)?.linked_accounts || (user as any)?.linkedAccounts || [];
    const solAccount = linkedAccounts.find(
      (acc: any) =>
        acc.type === 'wallet' &&
        (acc.chain_type === 'solana' || acc.chainType === 'solana')
    );
    return solAccount?.address || null;
  };

  const mySolanaAddress = getSolanaAddress();

  // Lọc bạn bè thực tế trong bán kính 50m từ Global Presence
  const candidateNearbyUsers: PresenceUser[] = nearbyUsers.filter(
    (u: PresenceUser) => u.distanceMeters === undefined || u.distanceMeters <= 50
  );

  // Vòng lặp Animations: Pulse & Radar sóng quét
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(radarWaveAnim, { toValue: 1.18, duration: 1200, useNativeDriver: true }),
        Animated.timing(radarWaveAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(radarRotateAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Khởi tạo phòng
  useEffect(() => {
    if (!roomId || !user) return;

    const myProfile: RoomMember = {
      user_id: user.id,
      name: currentUserProfile.name || 'Host',
      avatar: currentUserProfile.avatar || 'H',
      wallet_address: mySolanaAddress || undefined,
      isHost,
      status: isHost ? 'paid' : 'pending',
    };

    setMembers((prev) => (prev.length === 0 ? [myProfile] : prev));

    return () => {
      if (accelerometerSubRef.current) {
        accelerometerSubRef.current.remove();
        accelerometerSubRef.current = null;
      }
    };
  }, [roomId, user, isHost, mySolanaAddress, hostId]);

  // Kênh Realtime Đồng Bộ Phòng (room_${roomId})
  useEffect(() => {
    if (!roomId || !user) return;

    console.log(`📡 [ShakeRoom] Đăng ký kênh phòng: room_${roomId}`);
    const roomChannel = supabase.channel(`room_${roomId}`, {
      config: {
        broadcast: { ack: true },
      },
    });

    roomChannel
      .on('broadcast', { event: 'room_join' }, ({ payload }) => {
        console.log('👋 [ShakeRoom Realtime] Thành viên tham gia:', payload);
        if (payload?.user_id && payload.user_id !== user.id) {
          setMembers((prev) => {
            const exists = prev.some((m) => m.user_id === payload.user_id);
            if (exists) {
              return prev.map((m) =>
                m.user_id === payload.user_id
                  ? {
                      ...m,
                      name: payload.name || m.name,
                      avatar: payload.avatar || m.avatar,
                      avatar_url: payload.avatar_url || m.avatar_url,
                      wallet_address: payload.wallet_address || m.wallet_address,
                    }
                  : m
              );
            }
            return [
              ...prev,
              {
                user_id: payload.user_id,
                name: payload.name || 'Bạn mới',
                avatar: payload.avatar || 'U',
                avatar_url: payload.avatar_url || null,
                wallet_address: payload.wallet_address,
                isHost: false,
                status: 'pending',
              },
            ];
          });
          setInvitedStatusMap((prev) => ({ ...prev, [payload.user_id]: 'joined' }));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      })
      .on('broadcast', { event: 'room_reject' }, ({ payload }) => {
        console.log('❌ [ShakeRoom Realtime] Khách từ chối tham gia phòng:', payload);
        if (payload?.user_id) {
          setMembers((prev) => prev.filter((m) => m.user_id !== payload.user_id));
          setInvitedStatusMap((prev) => ({ ...prev, [payload.user_id]: 'rejected' }));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Alert.alert(
            'Từ chối tham gia',
            `${payload.name || 'Người dùng'} đã từ chối tham gia phòng chia tiền.`
          );
        }
      })
      .on('broadcast', { event: 'room_kick' }, ({ payload }) => {
        console.log('🚪 [ShakeRoom Realtime] Nhận sự kiện room_kick:', payload);
        if (payload?.target_user_id === user?.id) {
          // Bị Host xóa khỏi phòng -> Đẩy thiết bị ra khỏi room
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Alert.alert(
            'Rời khỏi phòng',
            payload.reason || 'Chủ phòng đã xóa bạn khỏi phòng chia tiền.',
            [
              {
                text: 'Đồng ý',
                onPress: () => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/(tabs)/transfer-hub');
                  }
                },
              },
            ],
            { cancelable: false }
          );

          // Tự động đẩy ra sau 1.2s
          setTimeout(() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/transfer-hub');
            }
          }, 1200);
        } else if (payload?.target_user_id) {
          // Các thiết bị khác cập nhật xóa thành viên khỏi danh sách phòng
          setMembers((prev) => prev.filter((m) => m.user_id !== payload.target_user_id));
        }
      })
      .on('broadcast', { event: 'room_split' }, ({ payload }) => {
        console.log('⚡ [ShakeRoom Realtime] Host đã chốt chia tiền:', payload);
        if (!isHost && payload?.split_amount) {
          setSplitAmount(String(payload.split_amount));
          if (payload.total_bill) setTotalBill(String(payload.total_bill));
          if (payload.note) setBillNote(payload.note);
          setGuestPhase('READY_TO_PAY');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      })
      .on('broadcast', { event: 'room_paid' }, ({ payload }) => {
        console.log('💰 [ShakeRoom Realtime] Thành viên đã thanh toán:', payload);
        if (payload?.user_id) {
          setMembers((prev) =>
            prev.map((m) =>
              m.user_id === payload.user_id
                ? { ...m, status: 'paid', tx_signature: payload.tx_signature }
                : m
            )
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      })
      .subscribe((status) => {
        console.log(`📡 [ShakeRoom] Trạng thái phòng room_${roomId}:`, status);
        if (status === 'SUBSCRIBED' && !isHost) {
          // Báo cho Host biết Guest đã vào phòng
          const userState = useUserStore.getState();
          roomChannel.send({
            type: 'broadcast',
            event: 'room_join',
            payload: {
              room_id: roomId,
              user_id: user.id,
              name: userState.username || currentUserProfile.name,
              avatar: currentUserProfile.avatar,
              avatar_url: userState.avatarUrl || null,
              wallet_address: mySolanaAddress,
            },
          });
        }
      });

    return () => {
      console.log(`🧹 [ShakeRoom] Hủy kênh room_${roomId}`);
      supabase.removeChannel(roomChannel);
    };
  }, [roomId, user?.id, isHost, mySolanaAddress, currentUserProfile]);

  // Logic Kích hoạt Chia Tiền (Shake Trigger / Nút bấm)
  const handleHostTriggerSplit = async () => {
    const bill = parseFloat(totalBill.replace(/,/g, '')) || 0;
    if (bill <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Số tiền chưa hợp lệ', 'Vui lòng nhập số tiền hóa đơn trước khi chia.');
      return;
    }

    const actualGuests = members.filter((m) => !m.isHost);
    if (actualGuests.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Chưa có thành viên tham gia',
        'Vui lòng chạm vào icon bạn bè ở gần để mời họ vào phòng trước khi chia bill.'
      );
      return;
    }

    const totalParticipants = actualGuests.length + 1; // Host + Guests
    const calculatedSplit = Number((bill / totalParticipants).toFixed(2));
    setSplitAmount(calculatedSplit.toString());

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setHostPhase('WAITING');

    // Bắn broadcast kích hoạt chia tiền đến tất cả thành viên trong phòng
    try {
      const roomChannel = supabase.channel(`room_${roomId}`);
      roomChannel.send({
        type: 'broadcast',
        event: 'room_split',
        payload: {
          room_id: roomId,
          total_bill: bill,
          split_amount: calculatedSplit,
          note: billNote,
        },
      });
    } catch (err) {
      console.log('Error broadcasting room split:', err);
    }

    if (accelerometerSubRef.current) {
      accelerometerSubRef.current.remove();
      accelerometerSubRef.current = null;
    }
  };

  // Quản lý cảm biến Lắc (Accelerometer)
  useEffect(() => {
    if (!isHost || hostPhase !== 'SETUP') {
      if (accelerometerSubRef.current) {
        accelerometerSubRef.current.remove();
        accelerometerSubRef.current = null;
      }
      return;
    }

    Accelerometer.setUpdateInterval(150);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const totalAcc = Math.sqrt(x * x + y * y + z * z);
      if (totalAcc > 1.75) {
        const now = Date.now();
        if (now - lastShakeTimeRef.current > 3000) {
          lastShakeTimeRef.current = now;
          handleHostTriggerSplit();
        }
      }
    });

    accelerometerSubRef.current = sub;

    return () => {
      if (accelerometerSubRef.current) {
        accelerometerSubRef.current.remove();
        accelerometerSubRef.current = null;
      }
    };
  }, [isHost, hostPhase, totalBill, members, billNote, mySolanaAddress]);

  // Host: Chạm vào Icon để mời trực tiếp 1 bạn bè vào phòng chia tiền
  const handleInviteSingleUser = async (targetUser: PresenceUser) => {
    if (members.some((m) => m.user_id === targetUser.user_id)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Đã tham gia', `${targetUser.name} đã ở trong phòng chia tiền.`);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setInvitedStatusMap((prev) => ({ ...prev, [targetUser.user_id]: 'inviting' }));

    const bill = parseFloat(totalBill.replace(/,/g, '')) || 0;
    const currentGuests = members.filter((m) => !m.isHost).length;
    const totalParticipants = Math.max(currentGuests + 2, 2);
    const calculatedSplit = Number((bill / totalParticipants).toFixed(2));

    try {
      const success = await broadcastInvite(roomId, [targetUser.user_id], {
        totalBill: bill,
        splitAmount: calculatedSplit,
        note: billNote,
      });

      if (success) {
        setInvitedStatusMap((prev) => ({ ...prev, [targetUser.user_id]: 'invited' }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Đã gửi lời mời 🎉',
          `Đã gửi lời mời tham gia phòng đến ${targetUser.name}. Đang đợi bạn ấy chấp nhận!`
        );
      } else {
        setInvitedStatusMap((prev) => {
          const next = { ...prev };
          delete next[targetUser.user_id];
          return next;
        });
      }
    } catch (err) {
      console.error('Error inviting user:', err);
      setInvitedStatusMap((prev) => {
        const next = { ...prev };
        delete next[targetUser.user_id];
        return next;
      });
      Alert.alert('Lỗi gửi lời mời', 'Không thể gửi lời mời đến thiết bị này.');
    }
  };

  // Xóa thành viên khỏi phòng & Đẩy thiết bị của thành viên đó ra khỏi room
  const handleRemoveMember = (memberUserId: string, memberName: string) => {
    Alert.alert('Xóa thành viên', `Bạn có chắc muốn xóa ${memberName} khỏi phòng?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          // 1. Xóa khỏi danh sách thành viên cục bộ của Host
          setMembers((prev) => prev.filter((m) => m.user_id !== memberUserId));
          setInvitedStatusMap((prev) => {
            const next = { ...prev };
            delete next[memberUserId];
            return next;
          });
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          // 2. Phát sóng sự kiện 'room_kick' để đẩy thiết bị guest ra khỏi phòng
          try {
            const roomChannel = supabase.channel(`room_${roomId}`);
            roomChannel.send({
              type: 'broadcast',
              event: 'room_kick',
              payload: {
                room_id: roomId,
                target_user_id: memberUserId,
                target_name: memberName,
                reason: 'Chủ phòng đã xóa bạn khỏi phòng chia tiền.',
              },
            });
            console.log(`🚪 [ShakeRoom] Đã phát sóng room_kick cho user ${memberUserId}`);
          } catch (err) {
            console.error('❌ [ShakeRoom] Lỗi khi phát sóng room_kick:', err);
          }
        },
      },
    ]);
  };

  // Sao chép và Chia sẻ Mã Phòng
  const copyRoomId = async () => {
    if (!roomId) return;
    await Clipboard.setStringAsync(roomId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Đã sao chép mã phòng', `Mã phòng: ${roomId}`);
  };

  const handleShareRoomCode = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: `Tham gia phòng chia tiền "${billNote}" trên N.E.D Wallet! Mã phòng: ${roomId}`,
        title: 'Mời chia tiền Shake & Split',
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  // Phía Host: Xác nhận & Hoàn tất thu tiền
  const handleHostClaimAndClose = async () => {
    if (!isHost || isHostClaiming) return;
    if (!user) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsHostClaiming(true);

    try {
      const currentActs = (await getCachedActivities()) || [];
      const newActivity: ActivityItem = {
        id: `split_income_${Date.now()}`,
        type: 'received',
        title: `Chia tiền nhóm (${paidGuestsCount} người)`,
        time: 'Vừa xong',
        amount: `+$${totalCollectedSoFar.toFixed(2)}`,
        isPositive: true,
        iconBg: '#8B5CF6',
        currency: 'USDC',
      };
      await cacheActivities([newActivity, ...currentActs]);

      setIsHostClaiming(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Thu tiền hoàn tất 🎉',
        `Đã thu đủ $${totalCollectedSoFar.toFixed(2)} từ các thành viên!`,
        [{ text: 'Hoàn tất', onPress: () => router.replace('/(tabs)/transfer-hub') }],
        { cancelable: false }
      );
    } catch (e) {
      setIsHostClaiming(false);
      Alert.alert('Thông báo', 'Không thể hoàn tất lúc này. Vui lòng thử lại.');
    }
  };

  // Phía Guest: Thanh toán On-chain gasless
  const handleGuestPay = async () => {
    if (isGuestPaying || isExecutingTransfer || hasGuestPaid) return;
    if (!user) return;

    const guestSolAddress = mySolanaAddress;
    const recipientAddress = hostWalletAddress || searchParams.hostWallet;
    const paymentAmountUSD = parseFloat(splitAmount) || 0;

    if (!guestSolAddress || !recipientAddress || paymentAmountUSD <= 0) {
      Alert.alert('Thông báo', 'Thông tin thanh toán chưa sẵn sàng.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsGuestPaying(true);

    try {
      const result = await executeTokenTransfer({
        fromAddress: guestSolAddress,
        recipientAddressOrPhone: recipientAddress,
        amountUsd: paymentAmountUSD,
      });

      if (!result.success || !result.transactionHash) {
        setIsGuestPaying(false);
        Alert.alert('Thanh toán chưa hoàn tất ❌', result.error || 'Giao dịch không thành công.');
        return;
      }

      const txSignature = result.transactionHash;
      const currentActs = (await getCachedActivities()) || [];
      const newActivity: ActivityItem = {
        id: txSignature,
        type: 'sent',
        title: 'Chia tiền hóa đơn',
        time: 'Vừa xong',
        amount: `-$${paymentAmountUSD.toFixed(2)}`,
        isPositive: false,
        iconBg: '#EF4444',
        signature: txSignature,
        currency: 'USDC',
      };
      await cacheActivities([newActivity, ...currentActs]);

      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === user.id ? { ...m, status: 'paid', tx_signature: txSignature } : m
        )
      );

      setHasGuestPaid(true);
      setIsGuestPaying(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Báo cho Host biết Guest đã thanh toán onchain
      try {
        const roomChannel = supabase.channel(`room_${roomId}`);
        roomChannel.send({
          type: 'broadcast',
          event: 'room_paid',
          payload: {
            room_id: roomId,
            user_id: user.id,
            tx_signature: txSignature,
          },
        });
      } catch (err) {
        console.log('Error broadcasting room paid:', err);
      }

      // Hiển thị Modal Hóa đơn giao dịch (Transaction Receipt)
      setReceiptData({
        amount: paymentAmountUSD,
        currency: 'USD',
        note: billNote || 'Group lunch',
        txHash: txSignature,
      });

      // Tự động ghi nhận thông báo chia tiền trong app
      const currentUserState = useUserStore.getState();
      const myUsername = currentUserState.username ? `@${currentUserState.username}.sol` : 'Ví của bạn';
      const myPhone = currentUserState.linkedPhone || undefined;
      const hostMember = members.find((m) => m.isHost);
      const hostName = hostMember?.name || 'Host phòng';

      useNotificationStore.getState().addNotification({
        type: 'TRANSFER',
        title: 'Thanh toán Shake to Split',
        message: `Đã thanh toán $${paymentAmountUSD.toFixed(2)} USD cho hóa đơn "${billNote || 'Group lunch'}".`,
        amount: paymentAmountUSD,
        currency: 'USDC',
        txHash: txSignature,
        sender: 'Bạn',
        senderName: myUsername,
        senderPhone: myPhone,
        senderWallet: guestSolAddress,
        recipientName: hostName,
        recipientWallet: recipientAddress,
        senderNote: billNote || 'Group lunch',
        network: 'Solana Devnet',
        fee: '0.000005 SOL',
      }).catch(console.error);

      // Bắn Realtime Broadcast thông báo nhận tiền đến ví Host
      broadcastTransferNotification({
        recipientWallet: recipientAddress,
        senderWallet: guestSolAddress,
        amount: paymentAmountUSD,
        currency: 'USDC',
        txHash: txSignature,
        senderName: myUsername,
        senderPhone: myPhone,
        recipientName: hostName,
        senderNote: billNote || 'Group lunch',
      }).catch(console.error);

      setShowReceiptModal(true);
    } catch (e: any) {
      setIsGuestPaying(false);
      Alert.alert('Giao dịch thất bại', e?.message || 'Không thể thanh toán lúc này.');
    }
  };

  // Tính toán
  const guests = members.filter((m) => !m.isHost);
  const paidGuests = guests.filter((m) => m.status === 'paid');
  const paidGuestsCount = paidGuests.length;
  const isAllPaid = paidGuestsCount === guests.length && guests.length > 0;

  const parsedTotalBill = parseFloat(totalBill.replace(/,/g, '')) || 0;
  const parsedSplitAmount =
    parseFloat(splitAmount.replace(/,/g, '')) ||
    Number((parsedTotalBill / (Math.max(guests.length, 1) + 1)).toFixed(2));
  const totalExpectedFromGuests = Number((parsedSplitAmount * guests.length).toFixed(2));
  const totalCollectedSoFar = Number((parsedSplitAmount * paidGuestsCount).toFixed(2));

  const displayRoomCode = roomId ? (roomId.length > 12 ? roomId.slice(0, 8).toUpperCase() : roomId) : 'Room_MTH';

  const displayHostName = hostName
    ? decodeURIComponent(hostName)
    : (searchParams.hostName ? decodeURIComponent(searchParams.hostName) : 'Đạt Tuấn');

  const [ticketContentHeight, setTicketContentHeight] = useState(390);
  const guestCardWidth = Math.min(SCREEN_WIDTH - 48, 330);
  const guestTicketSvgPath = getGuestTicketPath(guestCardWidth, ticketContentHeight, 24, 14, 8);

  if (!isReady) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={{ marginTop: 12, color: '#1F2937', fontWeight: '800' }}>
          Đang khởi tạo phòng Shake & Split...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#CDB4DB" />

      {/* Loading Overlay khi giao dịch đang xử lý */}
      {(isGuestPaying || isExecutingTransfer) && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay, { zIndex: 9999 }]}>
          <View style={styles.loadingModalContainer}>
            {/* Mascot gấu tím ngại ngùng ngồi tì hai tay lên mép thẻ */}
            <View style={styles.loadingMascotWrapper}>
              <Image
                source={require('@/assets/images/mascot teddy - embarrassed.png')}
                style={styles.loadingMascotImg}
                resizeMode="contain"
              />
            </View>

            <NeoCard
              backgroundColor="#FAF3E8"
              shadowColor="#000000"
              borderRadius={22}
              borderWidth={2.5}
              offset={4}
              containerStyle={styles.loadingNeoCardContainer}
              style={styles.loadingNeoCardInner}
            >
              <Text style={styles.loadingModalTitle}>
                Đang xác nhận trên thiết bị...
              </Text>
              <Text style={styles.loadingModalSubtitle}>
                Vui lòng giữ ứng dụng và chờ trong giây lát
              </Text>

              <StripedProgressBar />

              <Text style={styles.loadingModalFooterStatus}>
                {transferStatusMessage || 'Đang xử lí giao dịch...'}
              </Text>
            </NeoCard>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }}>
            {/* ========================================================= */}
            {/* 1. HEADER & ROOM INFO */}
            {/* ========================================================= */}
            <View style={styles.header}>
              {/* Circular Neo-Brutalism Back Button */}
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backBtnWrapper}
                activeOpacity={0.8}
              >
                <View style={styles.backBtnShadow} />
                <View style={styles.backBtnInner}>
                  <Ionicons name="chevron-back" size={20} color="#000000" />
                </View>
              </TouchableOpacity>

              {/* Title with Neo-brutalism Text Shadow */}
              <Text style={styles.headerTitle}>Shake & Split</Text>

              {/* Live Pill Badge */}
              <View style={styles.liveBadge}>
                <Animated.View
                  style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]}
                />
                <Text style={styles.liveText}>Live</Text>
              </View>
            </View>

            {/* Room Code Pill Badge */}
            <View style={styles.roomCodeContainer}>
              <TouchableOpacity
                onPress={copyRoomId}
                style={styles.roomCodePill}
                activeOpacity={0.8}
              >
                <Text style={styles.roomCodeText}>
                  Room Code # {displayRoomCode}
                </Text>
                <Feather name="copy" size={13} color="#000000" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>

            {/* ========================================================= */}
            {/* 2. CHẾ ĐỘ PHÒNG CHỜ DÀNH CHO GUEST (GUEST WAITING ROOM) */}
            {/* ========================================================= */}
            {!isHost && guestPhase === 'WAITING_FOR_HOST' ? (
              <View style={styles.guestWaitingWrapper}>
                {/* Mascot Section */}
                <View style={styles.mascotCenterArea}>
                  <Image
                    source={require('@/assets/images/mascot teddy - sleepy.png')}
                    style={styles.mascotImage}
                    resizeMode="contain"
                  />
                </View>

                {/* Center Notice Section */}
                <View style={styles.guestNoticeContainer}>
                  <Text style={styles.guestWaitingHeading}>Phòng chờ chia tiền</Text>
                  <Text style={styles.guestWaitingSubtext}>
                    Đang chờ người chủ trì{' '}
                    <Text style={styles.hostNameHighlight}>{displayHostName}</Text>{' '}
                    chốt hóa đơn và lắc thiết bị... ⏳
                  </Text>
                </View>

                {/* Spacer đẩy card xuống dưới cùng */}
                <View style={{ flex: 1 }} />

                {/* Bottom Guide Card (Thẻ Hướng Dẫn) */}
                <View style={styles.guestBottomSection}>
                  <NeoCard
                    backgroundColor="#FFFFFF"
                    shadowColor="#000000"
                    borderColor="#000000"
                    borderWidth={2.5}
                    borderRadius={20}
                    offset={4}
                    containerStyle={styles.guideCardContainer}
                    style={styles.guideCardContent}
                  >
                    <View style={styles.infoCircleBadge}>
                      <Text style={styles.infoLetterText}>i</Text>
                    </View>
                    <Text style={styles.guideCardMessage}>
                      Khi người chủ trì lắc điện thoại, số tiền chia đều của bạn sẽ xuất hiện ở đây.
                    </Text>
                  </NeoCard>

                  {/* Icon Chevron-up tinh tế phía dưới card */}
                  <View style={styles.bottomChevronContainer}>
                    <Feather name="chevron-up" size={20} color="#334155" />
                  </View>
                </View>
              </View>
            ) : !isHost && guestPhase === 'READY_TO_PAY' ? (
              /* ========================================================= */
              /* 2B. GIAO DIỆN THANH TOÁN HÓA ĐƠN CHO GUEST (READY_TO_PAY) */
              /* ========================================================= */
              <View style={styles.guestPaymentWrapper}>
                {/* Mascot Peeking from behind/on top of ticket */}
                <View style={styles.guestMascotPeekingArea}>
                  <Image
                    source={require('@/assets/images/mascot teddy - thinking.png')}
                    style={styles.guestMascotPeekingImg}
                    resizeMode="contain"
                  />
                </View>

                {/* Ticket Card with Scalloped Bottom Edge */}
                <View style={[styles.guestTicketWrapper, { width: guestCardWidth }]}>
                  {/* SVG Scalloped Border + Hard Drop Shadow */}
                  <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    <Svg
                      width={guestCardWidth + 12}
                      height={ticketContentHeight + 12}
                      viewBox={`0 0 ${guestCardWidth + 12} ${ticketContentHeight + 12}`}
                    >
                      {/* Bóng đổ đen cứng lệch 5px 5px */}
                      <Path d={guestTicketSvgPath} fill="#000000" transform="translate(5, 5)" />
                      {/* Vỏ vé trắng viền đen 2.5px */}
                      <Path
                        d={guestTicketSvgPath}
                        fill="#FFFFFF"
                        stroke="#000000"
                        strokeWidth={2.5}
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </View>

                  {/* Nội dung bên trong vé */}
                  <View
                    style={[styles.guestTicketContent, { width: guestCardWidth }]}
                    onLayout={(e) => {
                      const { height } = e.nativeEvent.layout;
                      if (height > 50 && Math.abs(height - ticketContentHeight) > 2) {
                        setTicketContentHeight(Math.ceil(height));
                      }
                    }}
                  >
                    {/* Header Hóa đơn */}
                    <View style={styles.guestTicketHeaderRow}>
                      <MaterialCommunityIcons
                        name="receipt-text-outline"
                        size={22}
                        color="#000000"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.guestTicketTitle}>Chi tiết hóa đơn</Text>
                    </View>

                    {/* Subtitle Host đã chốt số tiền */}
                    <Text style={styles.guestTicketSubtitle}>
                      Người chủ trì{' '}
                      <Text style={styles.guestTicketHostName}>{displayHostName}</Text>{' '}
                      đã chốt số tiền
                    </Text>

                    {/* Khối màu tím nhạt hiển thị số tiền cần thanh toán */}
                    <View style={styles.guestLavenderBox}>
                      <Text style={styles.guestLavenderLabel}>
                        Số tiền bạn cần thanh toán:
                      </Text>
                      <View style={styles.guestLavenderAmountRow}>
                        <Text style={styles.guestLavenderDollar}>$ </Text>
                        <Text style={styles.guestLavenderAmountText}>
                          {parsedSplitAmount.toFixed(2)}
                        </Text>
                        <Text style={styles.guestLavenderCurrency}> USD</Text>
                      </View>
                      <Text style={styles.guestLavenderNote}>
                        Ghi chú: {billNote || 'Group lunch'}
                      </Text>
                    </View>

                    {/* Đường phân cách nét đứt (Dotted Divider) */}
                    <View style={styles.guestDottedDivider} />

                    {/* Tổng hóa đơn phòng */}
                    <Text style={styles.guestTotalBillText}>
                      Tổng hóa đơn phòng: $ {parsedTotalBill.toFixed(2)} USD
                    </Text>

                    {/* Nút hành động Thanh toán màu đỏ san hô */}
                    <TouchableOpacity
                      style={[
                        styles.guestTicketPayBtn,
                        hasGuestPaid && styles.guestTicketPayBtnPaid,
                      ]}
                      onPress={handleGuestPay}
                      disabled={hasGuestPaid || isGuestPaying}
                      activeOpacity={0.88}
                    >
                      {isGuestPaying ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : hasGuestPaid ? (
                        <Text style={styles.guestTicketPayBtnText}>
                          ✓ Đã thanh toán thành công
                        </Text>
                      ) : (
                        <View style={styles.guestPayBtnInner}>
                          <Ionicons
                            name="flash"
                            size={18}
                            color="#FFFFFF"
                            style={{ marginRight: 6 }}
                          />
                          <Text style={styles.guestTicketPayBtnText}>
                            Thanh toán $ {parsedSplitAmount.toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Spacer đẩy mũi tên xuống dưới */}
                <View style={{ flex: 1 }} />

                {/* Mũi tên kép / chevron-up dưới đáy màn hình */}
                <View style={styles.guestBottomChevronWrapper}>
                  <Feather name="chevron-up" size={22} color="#000000" />
                </View>
              </View>
            ) : (
              /* ========================================================= */
              /* 3. CHẾ ĐỘ HOST SETUP / WAITING & GUEST READY TO PAY */
              /* ========================================================= */
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* 2. KHU VỰC NHẬP HÓA ĐƠN (TEXTINPUT LỚN + GHI CHÚ VIÊN THUỐC) */}
                <View style={styles.amountSection}>
                  {/* Ô nhập tiền cực lớn ở trung tâm */}
                  <View style={styles.amountInputRow}>
                    <Text style={styles.amountDollarSign}>$</Text>
                    <TextInput
                      style={styles.amountBigTextInput}
                      value={totalBill}
                      onChangeText={setTotalBill}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#6D28D9"
                      editable={isHost && hostPhase === 'SETUP'}
                      selectTextOnFocus
                    />
                    <Text style={styles.amountCurrencySuffix}>USD</Text>
                  </View>

                  {/* Ô nhập lý do chia tiền dạng viên thuốc kèm icon edit */}
                  <View style={styles.notePillContainer}>
                    <TextInput
                      style={styles.notePillInput}
                      value={billNote}
                      onChangeText={setBillNote}
                      placeholder="Group Lunch"
                      placeholderTextColor="#64748B"
                      editable={isHost && hostPhase === 'SETUP'}
                    />
                    <Feather name="edit-2" size={14} color="#000000" style={{ marginLeft: 6 }} />
                  </View>
                </View>

                {/* 3. THẺ RADAR & THÀNH VIÊN (KHỐI TRUNG TÂM LỚN #FDF8F0) */}
                <NeoCard
                  backgroundColor="#FDF8F0"
                  shadowColor="#000000"
                  borderColor="#000000"
                  borderWidth={2.5}
                  borderRadius={24}
                  offset={4}
                  containerStyle={styles.centerCardContainer}
                  style={styles.centerCardInner}
                >
                  {/* Phần trên của Card: Tiêu đề + Nút Share */}
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardTopTitle}>Bạn bè ở gần (20m)</Text>

                    <TouchableOpacity
                      style={styles.sharePillBtn}
                      onPress={handleShareRoomCode}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="share-social-outline" size={14} color="#000000" />
                      <Text style={styles.sharePillText}>Share</Text>
                    </TouchableOpacity>
                  </View>

                  {/* PHẦN DISCOVERY & RADAR QUÉT THIẾT BỊ */}
                  <View style={styles.radarSection}>
                    {candidateNearbyUsers.length === 0 ? (
                      /* TRẠNG THÁI 1: LOADING - Chưa phát hiện thiết bị xung quanh */
                      <View style={styles.loadingScanContainer}>
                        <TouchableOpacity
                          style={styles.radarTouchable}
                          onPress={isHost && hostPhase === 'SETUP' ? handleHostTriggerSplit : undefined}
                          activeOpacity={0.9}
                        >
                          <Animated.View
                            style={[
                              styles.radarConcentricOuter,
                              { transform: [{ scale: radarWaveAnim }] },
                            ]}
                          >
                            <View style={styles.radarConcentricMiddle}>
                              <View style={styles.radarConcentricInner}>
                                <View style={styles.radarCenterTarget}>
                                  <MaterialCommunityIcons
                                    name="radar"
                                    size={34}
                                    color="#6B4F3A"
                                  />
                                </View>
                              </View>
                            </View>
                          </Animated.View>
                        </TouchableOpacity>

                        <View style={styles.loadingTextRow}>
                          <ActivityIndicator size="small" color="#6B4F3A" style={{ marginRight: 8 }} />
                          <Text style={styles.scanningTitle}>
                            Đang quét tìm thiết bị xung quanh...
                          </Text>
                        </View>
                        <Text style={styles.scanningSubText}>
                          Hãy mở app N.E.D Wallet trên các máy gần nhau để tự động nhận diện
                        </Text>
                      </View>
                    ) : (
                      /* TRẠNG THÁI 2: ĐÃ PHÁT HIỆN THIẾT BỊ - Hiển thị Icon User hình tròn (tối đa 4 icon / hàng) */
                      <View style={styles.devicesDetectedContainer}>
                        <View style={styles.devicesHeaderRow}>
                          <View style={styles.devicesTitleWithDot}>
                            <View style={styles.pulseGreenDot} />
                            <Text style={styles.devicesCountTitle}>
                              Thiết bị ở gần ({candidateNearbyUsers.length})
                            </Text>
                          </View>
                          <Text style={styles.devicesTapHint}>
                            Chạm icon để mời
                          </Text>
                        </View>

                        {/* GRID USER: Tối đa 4 icon user mỗi hàng */}
                        <View style={styles.deviceGrid}>
                          {candidateNearbyUsers.map((u) => {
                            const inviteStatus = invitedStatusMap[u.user_id];
                            const isJoined = members.some((m) => m.user_id === u.user_id);

                            return (
                              <TouchableOpacity
                                key={u.user_id}
                                style={styles.deviceGridItem}
                                onPress={() => handleInviteSingleUser(u)}
                                disabled={isJoined || inviteStatus === 'inviting'}
                                activeOpacity={0.7}
                              >
                                <View style={styles.deviceAvatarWrapper}>
                                  <WalletUserAvatar
                                    avatarUrl={u.avatar_url}
                                    avatarLetter={u.avatar}
                                    name={u.name}
                                    size={58}
                                  />

                                  {/* Badge trạng thái mời */}
                                  {isJoined ? (
                                    <View style={styles.joinedBadge}>
                                      <Feather name="check" size={10} color="#FFFFFF" />
                                    </View>
                                  ) : inviteStatus === 'inviting' ? (
                                    <View style={styles.invitingBadge}>
                                      <ActivityIndicator size={8} color="#FFFFFF" />
                                    </View>
                                  ) : inviteStatus === 'invited' ? (
                                    <View style={styles.invitedBadge}>
                                      <Feather name="send" size={8} color="#FFFFFF" />
                                    </View>
                                  ) : inviteStatus === 'rejected' ? (
                                    <View style={styles.rejectedBadge}>
                                      <Feather name="x" size={9} color="#FFFFFF" />
                                    </View>
                                  ) : (
                                    <View style={styles.plusInviteBadge}>
                                      <Feather name="plus" size={10} color="#FFFFFF" />
                                    </View>
                                  )}
                                </View>

                                {/* Tên hiển thị theo đúng thông tin ví */}
                                <Text style={styles.deviceWalletName} numberOfLines={1}>
                                  {u.name || (u.wallet_address ? `${u.wallet_address.slice(0, 4)}...${u.wallet_address.slice(-4)}` : 'Ẩn danh')}
                                </Text>

                                {/* Trạng thái hoặc khoảng cách */}
                                <Text
                                  style={[
                                    styles.deviceStatusText,
                                    isJoined && styles.statusJoinedText,
                                    inviteStatus === 'invited' && styles.statusInvitedText,
                                    inviteStatus === 'rejected' && styles.statusRejectedText,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {isJoined
                                    ? 'Đã vào'
                                    : inviteStatus === 'inviting'
                                    ? 'Đang gửi...'
                                    : inviteStatus === 'invited'
                                    ? 'Đã mời'
                                    : inviteStatus === 'rejected'
                                    ? 'Từ chối'
                                    : u.distanceMeters !== undefined
                                    ? `${Math.round(u.distanceMeters)}m`
                                    : 'Gần đây'}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Dải phân cách (Divider) mỏng */}
                  <View style={styles.cardDivider} />

                  {/* Phần dưới của Card: Room members & Avatars */}
                  <View style={styles.membersSection}>
                    <Text style={styles.membersCountTitle}>
                      Room members ({members.length})
                    </Text>

                    <View style={styles.avatarListRow}>
                      {/* 1. Host Avatar */}
                      <View style={styles.avatarItemCol}>
                        <View style={styles.hostAvatarCircle}>
                          {currentUserStateAvatarUrl ? (
                            <Image
                              source={{ uri: currentUserStateAvatarUrl }}
                              style={styles.memberAvatarImg}
                              resizeMode="cover"
                            />
                          ) : (
                            <Text style={styles.hostAvatarLetter}>
                              {currentUserProfile?.avatar || 'H'}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.avatarSubLabel} numberOfLines={1}>Host</Text>
                      </View>

                      {/* 2. Danh sách các khách đã tham gia */}
                      {guests.map((g) => (
                        <View key={g.user_id} style={styles.avatarItemCol}>
                          <View
                            style={[
                              styles.guestAvatarCircle,
                              g.status === 'paid' && styles.guestAvatarPaid,
                            ]}
                          >
                            {g.avatar_url ? (
                              <Image
                                source={{ uri: g.avatar_url }}
                                style={styles.memberAvatarImg}
                                resizeMode="cover"
                              />
                            ) : (
                              <Text style={styles.guestAvatarLetter}>{g.avatar || 'U'}</Text>
                            )}
                          </View>
                          <Text style={styles.avatarSubLabel} numberOfLines={1}>
                            {g.name.split(' ').pop() || g.name}
                          </Text>

                          {/* Nút xóa thành viên nếu Host muốn gỡ */}
                          {isHost && hostPhase === 'SETUP' && (
                            <TouchableOpacity
                              style={styles.removeMemberBtn}
                              onPress={() => handleRemoveMember(g.user_id, g.name)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Feather name="x" size={9} color="#FFFFFF" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}

                      {/* 3. Nút "+ Share" (Viền nét đứt) */}
                      <TouchableOpacity
                        style={styles.avatarItemCol}
                        onPress={handleShareRoomCode}
                        activeOpacity={0.75}
                      >
                        <View style={styles.inviteDashedCircle}>
                          <Feather name="share-2" size={16} color="#000000" />
                        </View>
                        <Text style={styles.avatarSubLabel}>+ Share</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Phía Guest: Nút Thanh Toán Onchain nếu đã nhận Trigger */}
                  {!isHost && guestPhase === 'READY_TO_PAY' && (
                    <View style={{ marginTop: 14 }}>
                      <TouchableOpacity
                        style={[
                          styles.guestPayActionBtn,
                          hasGuestPaid && styles.guestPayActionBtnPaid,
                        ]}
                        onPress={handleGuestPay}
                        disabled={hasGuestPaid || isGuestPaying}
                        activeOpacity={0.88}
                      >
                        {isGuestPaying ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.guestPayActionBtnText}>
                            {hasGuestPaid
                              ? '✓ Đã thanh toán thành công'
                              : `⚡ Thanh toán $${parsedSplitAmount.toFixed(2)} USD`}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Phía Host: Nút chốt tiền nếu đang ở giai đoạn WAITING */}
                  {isHost && hostPhase === 'WAITING' && (
                    <View style={{ marginTop: 14 }}>
                      <TouchableOpacity
                        style={[
                          styles.hostFinishActionBtn,
                          !isAllPaid && styles.hostFinishActionBtnPending,
                        ]}
                        onPress={handleHostClaimAndClose}
                        disabled={!isAllPaid || isHostClaiming}
                        activeOpacity={0.88}
                      >
                        <Text style={styles.hostFinishActionBtnText}>
                          {isAllPaid
                            ? `Hoàn tất & Nhận +$${totalCollectedSoFar.toFixed(2)}`
                            : `Đang chờ thành viên (${paidGuestsCount}/${guests.length})`}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </NeoCard>
              </ScrollView>
            )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <WalletRecoveryModal
        visible={showRecoveryModal || needsRecovery}
        onClose={() => setShowRecoveryModal(false)}
        onSuccess={() => setShowRecoveryModal(false)}
      />

      <TransactionReceiptModal
        visible={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        amount={receiptData.amount}
        currency={receiptData.currency}
        note={receiptData.note}
        txHash={receiptData.txHash}
      />
    </SafeAreaView>
  );
}

// ==========================================
// 🎨 NEO-BRUTALISM STYLESHEET
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#BFA3EC', // Tím pastel đậm đà theo thiết kế (#BFA3EC / #BCA1E6)
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingModalContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMascotWrapper: {
    zIndex: 10,
    marginBottom: -18,
    alignItems: 'center',
  },
  loadingMascotImg: {
    width: 145,
    height: 115,
  },
  loadingNeoCardContainer: {
    width: '85%',
    maxWidth: 330,
  },
  loadingNeoCardInner: {
    alignItems: 'center',
    paddingTop: 26,
    paddingBottom: 22,
    paddingHorizontal: 20,
  },
  loadingModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  loadingModalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
    paddingHorizontal: 6,
  },
  stripedBarBorder: {
    width: '100%',
    height: 26,
    borderRadius: 13,
    borderWidth: 2.2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  stripedBarInner: {
    flex: 1,
    borderRadius: 11,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  loadingModalFooterStatus: {
    fontSize: 11.5,
    fontStyle: 'italic',
    color: '#8A8A8A',
    textAlign: 'center',
    marginTop: 12,
  },

  // 1. Header & Room Info
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtnWrapper: {
    position: 'relative',
    width: 42,
    height: 42,
  },
  backBtnShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
  },
  backBtnInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.8,
    borderColor: '#000000',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
    marginRight: 5,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
  },

  // Room Code Pill
  roomCodeContainer: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  roomCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF8F0',
    borderWidth: 1.8,
    borderColor: '#000000',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  roomCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.2,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 28,
  },

  // 2. Amount Section
  amountSection: {
    alignItems: 'center',
    marginVertical: 10,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  amountDollarSign: {
    fontSize: 42,
    fontWeight: '900',
    color: '#000000',
    marginRight: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 0,
  },
  amountBigTextInput: {
    fontSize: 44,
    fontWeight: '900',
    color: '#000000',
    minWidth: 80,
    textAlign: 'center',
    padding: 0,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 0,
  },
  amountCurrencySuffix: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    marginLeft: 6,
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  notePillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF8F0',
    borderWidth: 1.8,
    borderColor: '#000000',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  notePillInput: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#4B5563',
    padding: 0,
    minWidth: 90,
    textAlign: 'center',
  },

  // 3. Central Radar & Members Card (#FDF8F0)
  centerCardContainer: {
    marginTop: 10,
  },
  centerCardInner: {
    padding: 20,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTopTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  sharePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.8,
    borderColor: '#000000',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  sharePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },

  // Radar Art
  radarSection: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  radarTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarConcentricOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: 'rgba(107, 79, 58, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarConcentricMiddle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2.2,
    borderColor: 'rgba(107, 79, 58, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarConcentricInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2.5,
    borderColor: '#6B4F3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCenterTarget: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningText: {
    fontSize: 12.5,
    color: '#78716C',
    fontWeight: '600',
    marginTop: 14,
  },
  // Loading state khi chưa phát hiện thiết bị
  loadingScanContainer: {
    alignItems: 'center',
    width: '100%',
  },
  loadingTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  scanningTitle: {
    fontSize: 13.5,
    color: '#1F2937',
    fontWeight: '700',
  },
  scanningSubText: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 12,
  },

  // Danh sách thiết bị dạng Grid (Tối đa 4 icon user mỗi hàng)
  devicesDetectedContainer: {
    width: '100%',
    marginTop: 2,
  },
  devicesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  devicesTitleWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseGreenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  devicesCountTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1F2937',
  },
  devicesTapHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  deviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    width: '100%',
  },
  deviceGridItem: {
    width: '25%', // Tối đa 4 icon user mỗi hàng
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  deviceAvatarWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  joinedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitingBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#3B82F6',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#6366F1',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusInviteBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceWalletName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    width: '100%',
  },
  deviceStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  statusJoinedText: {
    color: '#10B981',
    fontWeight: '800',
  },
  statusInvitedText: {
    color: '#6366F1',
    fontWeight: '800',
  },
  statusRejectedText: {
    color: '#EF4444',
    fontWeight: '800',
  },
  removeMemberBtn: {
    position: 'absolute',
    top: -4,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  memberAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
  },

  cardDivider: {
    height: 1.5,
    backgroundColor: '#E7E0D6',
    marginVertical: 14,
  },

  // Room Members
  membersSection: {
    marginTop: 2,
  },
  membersCountTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
  },
  avatarListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarItemCol: {
    alignItems: 'center',
    width: 52,
  },
  hostAvatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostAvatarLetter: {
    fontSize: 18,
    fontWeight: '900',
    color: '#DC2626',
  },
  guestAvatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E0E7FF',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestAvatarPaid: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  guestAvatarLetter: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  inviteDashedCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FDF8F0',
    borderWidth: 2,
    borderColor: '#000000',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSubLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 6,
    textAlign: 'center',
  },

  guestPayActionBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#000000',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestPayActionBtnPaid: {
    backgroundColor: '#10B981',
  },
  guestPayActionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  hostFinishActionBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#000000',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostFinishActionBtnPending: {
    backgroundColor: '#6B7280',
    opacity: 0.8,
  },
  hostFinishActionBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 4. Guest Waiting Room (Phòng chờ chia tiền) Styles
  guestWaitingWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mascotCenterArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 6,
    width: '100%',
  },
  mascotImage: {
    width: 320,
    height: 220,
  },
  guestNoticeContainer: {
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 12,
  },
  guestWaitingHeading: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  guestWaitingSubtext: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  hostNameHighlight: {
    color: '#6D28D9',
    fontWeight: '900',
  },
  guestBottomSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  guideCardContainer: {
    width: '100%',
  },
  guideCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  infoCircleBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5CF6',
    borderWidth: 2.2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  infoLetterText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  guideCardMessage: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 19,
  },
  bottomChevronContainer: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestPaymentWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    width: '100%',
  },
  guestMascotPeekingArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -12,
    zIndex: 10,
  },
  guestMascotPeekingImg: {
    width: 175,
    height: 135,
  },
  guestTicketWrapper: {
    position: 'relative',
    alignSelf: 'center',
  },
  guestTicketContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 26,
    zIndex: 2,
  },
  guestTicketHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  guestTicketTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    fontFamily: 'Outfit-Bold',
  },
  guestTicketSubtitle: {
    fontSize: 13.5,
    color: '#4B5563',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  guestTicketHostName: {
    color: '#7C3AED',
    fontWeight: '900',
  },
  guestLavenderBox: {
    backgroundColor: '#EBE5F7',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  guestLavenderLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 4,
  },
  guestLavenderAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginVertical: 4,
  },
  guestLavenderDollar: {
    fontSize: 24,
    fontWeight: '900',
    color: '#432C81',
    fontFamily: 'Outfit-Bold',
  },
  guestLavenderAmountText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#432C81',
    fontFamily: 'Outfit-Bold',
  },
  guestLavenderCurrency: {
    fontSize: 16,
    fontWeight: '800',
    color: '#432C81',
    fontFamily: 'Outfit-Bold',
  },
  guestLavenderNote: {
    fontSize: 12.5,
    fontStyle: 'italic',
    color: '#6B7280',
    marginTop: 6,
  },
  guestDottedDivider: {
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#9CA3AF',
    marginVertical: 14,
  },
  guestTotalBillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
  },
  guestTicketPayBtn: {
    backgroundColor: '#FF5B5B',
    borderWidth: 2.5,
    borderColor: '#000000',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  guestTicketPayBtnPaid: {
    backgroundColor: '#10B981',
  },
  guestPayBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestTicketPayBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'Outfit-Bold',
  },
  guestBottomChevronWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
  },
});
