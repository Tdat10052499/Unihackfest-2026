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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Accelerometer } from 'expo-sensors';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { supabase } from '@/services/supabase';
import {
  cacheBalance,
  getCachedBalance,
  cacheActivities,
  getCachedActivities,
} from '@/services/storage';
import {
  solanaConnection,
  getSolanaBalance,
  ActivityItem,
} from '@/services/solana';
import { useGlobalPresence } from '@/contexts/GlobalPresenceContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Tỷ giá quy đổi ngầm: 1 SOL = $150 USD
const SOL_USD_RATE = 150;

interface RoomMember {
  user_id: string;
  name: string;
  avatar: string;
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

  let privy: any = null;
  try {
    privy = usePrivy();
  } catch (e) {}
  const user = privy?.user || null;

  let solanaWalletState: any = null;
  try {
    solanaWalletState = useEmbeddedSolanaWallet();
  } catch (e) {}

  const { nearbyUsers, broadcastInvite, currentUserProfile } = useGlobalPresence();

  // Xác định người dùng là Host hay Guest
  const isHost =
    searchParams.isHost === 'true' ||
    !hostId ||
    (user?.id && hostId && user.id === hostId);

  // Lưu địa chỉ ví On-chain của Host
  const [hostWalletAddress, setHostWalletAddress] = useState<string>(
    searchParams.hostWallet ? decodeURIComponent(searchParams.hostWallet) : ''
  );

  // Host Phases: 'SETUP' (Nhập tiền, mời bạn bè & lắc) | 'WAITING' (Quản lý chờ thanh toán)
  const [hostPhase, setHostPhase] = useState<'SETUP' | 'WAITING'>('SETUP');

  // Guest Phases: 'WAITING_FOR_HOST' (Chờ Host lắc) | 'READY_TO_PAY' (Đã nhận trigger_split)
  const [guestPhase, setGuestPhase] = useState<'WAITING_FOR_HOST' | 'READY_TO_PAY'>(
    searchParams.splitAmount && parseFloat(searchParams.splitAmount) > 0
      ? 'READY_TO_PAY'
      : 'WAITING_FOR_HOST'
  );

  // State Hóa đơn (Định dạng Dollar USD)
  const [totalBill, setTotalBill] = useState(searchParams.totalBill || '20');
  const [splitAmount, setSplitAmount] = useState(searchParams.splitAmount || '0');
  const [billNote, setBillNote] = useState(
    searchParams.note ? decodeURIComponent(searchParams.note) : 'Group Lunch'
  );

  // State Thành viên phòng
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [isInvitingNearby, setIsInvitingNearby] = useState(false);

  // State Quét Radar & Tích chọn từng Guest để mời
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // State Thanh toán của Guest & Nhận tiền Host
  const [isGuestPaying, setIsGuestPaying] = useState(false);
  const [hasGuestPaid, setHasGuestPaid] = useState(false);
  const [isHostClaiming, setIsHostClaiming] = useState(false);

  // Refs & Animations
  const roomChannelRef = useRef<RealtimeChannel | null>(null);
  const accelerometerSubRef = useRef<any>(null);
  const lastShakeTimeRef = useRef(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarWaveAnim = useRef(new Animated.Value(1)).current;

  // Lấy địa chỉ ví Solana On-chain (Base58) của người dùng hiện tại
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

  // 100% Realtime: Lọc bạn bè thực tế trong bán kính 20m từ global_radar
  const candidateNearbyUsers = nearbyUsers.filter(
    (u) => u.distanceMeters !== undefined && u.distanceMeters <= 20
  );

  // Đồng bộ selectedUserIds khi có thiết bị mới xuất hiện
  useEffect(() => {
    if (candidateNearbyUsers.length > 0) {
      const validIds = candidateNearbyUsers.map((u) => u.user_id);
      setSelectedUserIds((prev) => {
        const filtered = prev.filter((id) => validIds.includes(id));
        return filtered.length > 0 ? filtered : validIds;
      });
    } else {
      setSelectedUserIds([]);
    }
  }, [candidateNearbyUsers.length]);

  // Toggle chọn từng người dùng
  const toggleUserSelection = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Animations loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(radarWaveAnim, { toValue: 1.35, duration: 1200, useNativeDriver: true }),
        Animated.timing(radarWaveAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // 1. Khởi tạo kết nối channel cục bộ: room_[room_id]
  useEffect(() => {
    if (!roomId || !user) return;

    const channelName = `room_${roomId}`;
    console.log(`🔌 [Shake Room] Kết nối channel: ${channelName}`);

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    const myProfile: RoomMember = {
      user_id: user.id,
      name: currentUserProfile.name || 'User',
      avatar: currentUserProfile.avatar || 'U',
      wallet_address: mySolanaAddress || undefined,
      isHost,
      status: isHost ? 'paid' : 'pending',
    };

    channel
      // A. Presence Sync: Danh sách người có mặt trong phòng
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<RoomMember>();
        const presenceList: RoomMember[] = [];

        Object.keys(state).forEach((key) => {
          const presences = state[key];
          if (presences && presences.length > 0) {
            const p = presences[presences.length - 1];
            presenceList.push(p);
          }
        });

        // Tìm địa chỉ ví của Host từ presence list nếu chưa có
        const foundHost = presenceList.find(
          (m) => m.isHost || (hostId && m.user_id === hostId)
        );
        if (foundHost?.wallet_address) {
          setHostWalletAddress(foundHost.wallet_address);
        }

        setMembers((prev) => {
          const paidMap = new Map(
            prev.filter((m) => m.status === 'paid').map((m) => [m.user_id, m.tx_signature])
          );
          const baseList = presenceList.length > 0 ? presenceList : [myProfile];
          return baseList.map((m) => ({
            ...m,
            status: m.isHost || paidMap.has(m.user_id) ? 'paid' : m.status || 'pending',
            tx_signature: paidMap.get(m.user_id) || m.tx_signature,
          }));
        });
      })
      // B. Event trigger_split: Guest nhận lệnh chia tiền
      .on('broadcast', { event: 'trigger_split' }, ({ payload }) => {
        console.log('⚡ [Shake Room] Nhận sự kiện trigger_split:', payload);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (payload?.total_bill) setTotalBill(payload.total_bill.toString());
        if (payload?.split_amount) setSplitAmount(payload.split_amount.toString());
        if (payload?.note) setBillNote(payload.note);
        if (payload?.host_wallet_address) {
          setHostWalletAddress(payload.host_wallet_address);
        }

        if (!isHost) {
          setGuestPhase('READY_TO_PAY');
        }
      })
      // C. Event payment_update: Host nhận xác nhận giao dịch từ Guest
      .on('broadcast', { event: 'payment_update' }, ({ payload }) => {
        console.log('💰 [Shake Room] Nhận sự kiện payment_update:', payload);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setMembers((prev) =>
          prev.map((m) =>
            m.user_id === payload.user_id
              ? { ...m, status: 'paid', tx_signature: payload.tx_signature }
              : m
          )
        );
      })
      // D. Event room_closed: Guest nhận lệnh giải tán phòng khi Host hoàn tất
      .on('broadcast', { event: 'room_closed' }, () => {
        console.log('🚪 [Shake Room] Nhận sự kiện room_closed từ Host');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (!isHost) {
          Alert.alert(
            'Hoàn tất 🎉',
            'Giao dịch đã được hoàn tất!',
            [
              {
                text: 'Xác nhận',
                onPress: () => {
                  router.replace('/(tabs)');
                },
              },
            ],
            { cancelable: false }
          );
        }
      })
      .subscribe((status) => {
        console.log(`📡 [Shake Room] Channel ${channelName} status:`, status);
        if (status === 'SUBSCRIBED') {
          channel.track(myProfile);
        }
      });

    roomChannelRef.current = channel;

    return () => {
      console.log(`🧹 [Shake Room] Dọn dẹp channel ${channelName}`);
      if (roomChannelRef.current) {
        roomChannelRef.current.unsubscribe();
        supabase.removeChannel(roomChannelRef.current);
        roomChannelRef.current = null;
      }
      if (accelerometerSubRef.current) {
        accelerometerSubRef.current.remove();
        accelerometerSubRef.current = null;
      }
    };
  }, [roomId, user, isHost, mySolanaAddress, hostId]);

  // Khởi tạo thành viên cơ bản
  useEffect(() => {
    if (user && members.length === 0) {
      setMembers([
        {
          user_id: user.id,
          name: currentUserProfile.name || (isHost ? 'Host' : 'Me'),
          avatar: currentUserProfile.avatar || 'U',
          wallet_address: mySolanaAddress || undefined,
          isHost,
          status: isHost ? 'paid' : 'pending',
        },
      ]);
    }
  }, [user, isHost, mySolanaAddress]);

  // 2. Logic Lắc thiết bị (Shake Trigger) cho Host trong Phase SETUP
  const handleHostTriggerSplit = async () => {
    const bill = parseFloat(totalBill.replace(/,/g, '')) || 0;
    if (bill <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Số tiền chưa hợp lệ', 'Vui lòng nhập số tiền hóa đơn trước khi chia.');
      return;
    }

    const invitedGuestCount =
      selectedUserIds.length > 0
        ? selectedUserIds.length
        : Math.max(members.filter((m) => !m.isHost).length, 1);
    const totalParticipants = invitedGuestCount + 1; // Host + Guests
    const calculatedSplit = Number((bill / totalParticipants).toFixed(2));
    setSplitAmount(calculatedSplit.toString());

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log('🚀 [Host] Chốt chia tiền:', {
      totalBill: bill,
      splitAmount: calculatedSplit,
      invitedGuestCount,
      totalParticipants,
    });

    if (roomChannelRef.current) {
      try {
        await roomChannelRef.current.send({
          type: 'broadcast',
          event: 'trigger_split',
          payload: {
            room_id: roomId,
            host_id: user.id,
            host_wallet_address: mySolanaAddress,
            total_bill: bill,
            split_amount: calculatedSplit,
            note: billNote,
          },
        });
      } catch (e) {
        console.error('Lỗi khi gửi trigger_split:', e);
      }
    }

    setHostPhase('WAITING');

    if (accelerometerSubRef.current) {
      accelerometerSubRef.current.remove();
      accelerometerSubRef.current = null;
    }
  };

  // 3. Quản lý cảm biến gia tốc Accelerometer trong Phase SETUP của Host
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
  }, [isHost, hostPhase, totalBill, members, billNote, selectedUserIds, mySolanaAddress]);

  // Host: Mời các bạn bè ĐÃ TÍCH CHỌN vào phòng qua global_radar
  const handleInviteNearbyFriends = async () => {
    if (selectedUserIds.length === 0) {
      Alert.alert('Chưa chọn bạn bè', 'Vui lòng tích chọn ít nhất 1 người bạn để gửi lời mời.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsInvitingNearby(true);

    const bill = parseFloat(totalBill.replace(/,/g, '')) || 0;

    try {
      await broadcastInvite(roomId, selectedUserIds, {
        totalBill: bill,
        note: billNote,
      });
      setIsInvitingNearby(false);
      Alert.alert(
        'Đã gửi lời mời 🎉',
        `Đã gửi lời mời tham gia phòng đến ${selectedUserIds.length} người bạn gần bạn!`
      );
    } catch (e) {
      setIsInvitingNearby(false);
      Alert.alert('Thông báo', 'Không thể gửi lời mời lúc này. Vui lòng thử lại.');
    }
  };

  // 4. Phía Host: 'Xác nhận & Nhận tiền' -> Đóng phòng và ghi nhận hoạt động
  const handleHostClaimAndClose = async () => {
    if (!isHost || isHostClaiming) return;
    if (!user) {
      Alert.alert('Thông báo', 'Không tìm thấy thông tin tài khoản.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsHostClaiming(true);

    try {
      // Ghi nhận Lịch Sử Hoạt Động (Recent Activity)
      const currentActs = (await getCachedActivities()) || [];
      const newActivity: ActivityItem = {
        id: `shake_rcv_${Date.now()}`,
        type: 'received',
        title: `Chia tiền nhóm (${paidGuestsCount} người)`,
        time: 'Vừa xong',
        amount: `+$${totalCollectedSoFar.toFixed(2)}`,
        isPositive: true,
        iconBg: '#00A859',
      };
      await cacheActivities([newActivity, ...currentActs]);

      // Phát sóng sự kiện room_closed lên channel room_[roomId] để giải tán phòng
      if (roomChannelRef.current) {
        try {
          await roomChannelRef.current.send({
            type: 'broadcast',
            event: 'room_closed',
            payload: {
              room_id: roomId,
              host_id: user.id,
              total_collected: totalCollectedSoFar,
              closed_at: new Date().toISOString(),
            },
          });
        } catch (err) {
          console.error('Lỗi khi gửi room_closed:', err);
        }
      }

      setIsHostClaiming(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Thu tiền hoàn tất 🎉',
        `Đã thu đủ $${totalCollectedSoFar.toFixed(2)} từ các thành viên!`,
        [
          {
            text: 'Hoàn tất',
            onPress: () => router.replace('/(tabs)/transfer-hub'),
          },
        ],
        { cancelable: false }
      );
    } catch (e) {
      setIsHostClaiming(false);
      console.error('Lỗi khi Host nhận tiền:', e);
      Alert.alert('Thông báo', 'Không thể hoàn tất lúc này. Vui lòng thử lại.');
    }
  };

  // 5. Phía Guest: THỰC THI GIAO DỊCH ON-CHAIN TRÊN SOLANA DEVNET (Sign & Send Transaction)
  const handleGuestPay = async () => {
    if (isGuestPaying || hasGuestPaid) return;
    if (!user) {
      Alert.alert('Thông báo', 'Vui lòng đăng nhập để tiếp tục.');
      return;
    }

    const guestSolAddress = mySolanaAddress;
    if (!guestSolAddress) {
      Alert.alert('Thông báo', 'Không tìm thấy thông tin ví tài khoản.');
      return;
    }

    const recipientAddress = hostWalletAddress || searchParams.hostWallet;
    if (!recipientAddress) {
      Alert.alert('Thông báo', 'Đang kết nối với người chủ trì, vui lòng thử lại sau giây lát.');
      return;
    }

    const paymentAmountUSD = parseFloat(splitAmount) || 0;
    if (paymentAmountUSD <= 0) {
      Alert.alert('Thông báo', 'Số tiền thanh toán chưa hợp lệ.');
      return;
    }

    // Quy đổi Dollar sang SOL: 1 SOL = $150 USD
    const solAmount = Math.max(0.0001, Number((paymentAmountUSD / SOL_USD_RATE).toFixed(6)));
    const sendLamports = Math.floor(solAmount * 1e9);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsGuestPaying(true);

    try {
      // 1. Kiểm tra số dư khả dụng
      let currentLamports = 0;
      try {
        currentLamports = await solanaConnection.getBalance(new PublicKey(guestSolAddress));
      } catch (err) {
        const cachedSol = await getCachedBalance();
        currentLamports = Math.floor((cachedSol ?? 0.1) * 1e9);
      }

      const requiredLamports = sendLamports + 5000;
      if (currentLamports < requiredLamports) {
        setIsGuestPaying(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Số dư không đủ',
          `Số dư trong ví không đủ để thực hiện thanh toán $${paymentAmountUSD.toFixed(2)}. Vui lòng nạp thêm tiền!`
        );
        return;
      }

      // 2. Ký & Gửi Giao Dịch
      if (!solanaWalletState?.wallets || solanaWalletState.wallets.length === 0) {
        throw new Error('Ví tài khoản chưa sẵn sàng.');
      }

      const provider = await solanaWalletState.wallets[0].getProvider();
      const fromPubkey = new PublicKey(guestSolAddress);
      const toPubkey = new PublicKey(recipientAddress);

      const { blockhash, lastValidBlockHeight } =
        await solanaConnection.getLatestBlockhash('confirmed');

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: sendLamports,
        })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      const { signedTransaction } = await provider.request({
        method: 'signTransaction',
        params: { transaction },
      });

      // 3. Broadcast và chờ Xác nhận
      const rawBytes = signedTransaction.serialize();
      const txSignature = await solanaConnection.sendRawTransaction(rawBytes, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      const confirmation = await solanaConnection.confirmTransaction(
        {
          signature: txSignature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed'
      );

      if (confirmation.value.err) {
        throw new Error('Giao dịch chưa được xác nhận thành công');
      }

      // 4. Ghi Log Lịch Sử Hoạt Động (Recent Activity)
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
      };
      await cacheActivities([newActivity, ...currentActs]);

      // 5. Phát sóng sự kiện Realtime cập nhật trạng thái
      if (roomChannelRef.current) {
        await roomChannelRef.current.send({
          type: 'broadcast',
          event: 'payment_update',
          payload: {
            user_id: user.id,
            name: currentUserProfile.name,
            status: 'paid',
            tx_signature: txSignature,
            amount: paymentAmountUSD,
            paid_at: new Date().toISOString(),
          },
        });
      }

      setHasGuestPaid(true);
      setIsGuestPaying(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert('Thành công! 🎉', 'Thanh toán thành công!');
    } catch (e: any) {
      console.error('Lỗi khi thực hiện giao dịch:', e);
      setIsGuestPaying(false);
      Alert.alert(
        'Giao dịch thất bại',
        'Không thể hoàn tất thanh toán lúc này. Vui lòng thử lại sau.'
      );
    }
  };

  const copyRoomId = async () => {
    if (!roomId) return;
    await Clipboard.setStringAsync(roomId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Đã sao chép mã phòng', roomId);
  };

  // Tính toán số lượng và số tiền phía Host (USD)
  const guests = members.filter((m) => !m.isHost);
  const paidGuests = guests.filter((m) => m.status === 'paid');
  const paidGuestsCount = paidGuests.length;
  const isAllPaid = paidGuestsCount === guests.length && guests.length > 0;

  const parsedTotalBill = parseFloat(totalBill.replace(/,/g, '')) || 0;
  const parsedSplitAmount =
    parseFloat(splitAmount.replace(/,/g, '')) ||
    Number((parsedTotalBill / (Math.max(guests.length, 1) + 1)).toFixed(2));

  // Tổng tiền Host cần thu = Tiền mỗi người * Số lượng Guest
  const totalExpectedFromGuests = Number((parsedSplitAmount * guests.length).toFixed(2));
  // Tổng tiền Host đã thu được realtime = Tiền mỗi người * Số lượng Guest đã thanh toán
  const totalCollectedSoFar = Number((parsedSplitAmount * paidGuestsCount).toFixed(2));

  const displayRoomCode = roomId ? roomId.slice(0, 8).toUpperCase() : 'LOBBY';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Loading Overlay Toàn Màn Hình Khi Thanh Toán */}
      <Modal visible={isGuestPaying} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#00A859" />
            <Text style={styles.loadingCardTitle}>Đang xử lý thanh toán...</Text>
            <Text style={styles.loadingCardSubtitle}>
              Vui lòng giữ ứng dụng và chờ trong giây lát
            </Text>
          </View>
        </View>
      </Modal>

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Shake to Split</Text>
          <TouchableOpacity
            style={styles.roomIdBadge}
            onPress={copyRoomId}
            activeOpacity={0.7}
          >
            <Text style={styles.roomIdText}>MÃ PHÒNG: #{displayRoomCode}</Text>
            <Feather name="copy" size={12} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <View style={styles.liveIndicator}>
          <Animated.View
            style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]}
          />
          <Text style={styles.liveText}>TRỰC TIẾP</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================= */}
        {/* 🅰️ KHÔNG GIAN HOST (NGƯỜI CHỦ TRÌ) */}
        {/* ================================================================= */}
        {isHost ? (
          hostPhase === 'SETUP' ? (
            /* 1. HOST GIAI ĐOẠN SETUP: Nhập tiền Dollar, Tích chọn bạn bè & Lắc */
            <View style={styles.hostSetupContainer}>
              {/* Thẻ Nhập Tiền Hóa Đơn (Dollar USD) */}
              <View style={styles.billInputCard}>
                <View style={styles.cardHeaderRow}>
                  <MaterialCommunityIcons name="receipt" size={22} color="#8B5CF6" />
                  <Text style={styles.cardHeaderTitle}>Tổng tiền hóa đơn</Text>
                </View>

                <View style={styles.amountInputRow}>
                  <Text style={styles.currencyPrefix}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={totalBill}
                    onChangeText={setTotalBill}
                    placeholder="0.00"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                  <Text style={styles.currencySuffix}>USD</Text>
                </View>

                {/* Phím preset nhanh (Dollar USD) */}
                <View style={styles.presetRow}>
                  {['5', '10', '20', '50', '100'].map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      style={[
                        styles.presetPill,
                        totalBill === preset && styles.presetPillActive,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setTotalBill(preset);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.presetText,
                          totalBill === preset && styles.presetTextActive,
                        ]}
                      >
                        ${preset}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Ghi chú */}
                <View style={styles.noteInputRow}>
                  <Feather name="edit-2" size={14} color="#94A3B8" />
                  <TextInput
                    style={styles.noteInput}
                    value={billNote}
                    onChangeText={setBillNote}
                    placeholder="Ghi chú (ví dụ: Ăn trưa cùng nhóm)"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>

              {/* Thẻ Quét & TÍCH CHỌN Bạn Bè Xung Quanh (20m) */}
              <View style={styles.nearbySectionCard}>
                <View style={styles.sectionHeaderBetween}>
                  <View>
                    <Text style={styles.nearbyTitle}>
                      Bạn bè ở gần (20m)
                    </Text>
                    <Text style={styles.nearbySubtitle}>
                      {candidateNearbyUsers.length > 0
                        ? `Đã chọn ${selectedUserIds.length}/${candidateNearbyUsers.length} người`
                        : 'Đang quét tự động xung quanh'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.inviteActionBtn,
                      (selectedUserIds.length === 0 || isInvitingNearby) &&
                        styles.inviteActionBtnDisabled,
                    ]}
                    onPress={handleInviteNearbyFriends}
                    disabled={isInvitingNearby || selectedUserIds.length === 0}
                    activeOpacity={0.8}
                  >
                    {isInvitingNearby ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="paper-plane" size={14} color="#FFFFFF" />
                        <Text style={styles.inviteActionBtnText}>
                          {selectedUserIds.length > 0
                            ? `Mời (${selectedUserIds.length})`
                            : 'Mời'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Danh sách người dùng lân cận hoặc EMPTY STATE */}
                {candidateNearbyUsers.length === 0 ? (
                  <View style={styles.emptyRadarContainer}>
                    <View style={styles.emptyRadarIconCircle}>
                      <MaterialCommunityIcons name="radar" size={36} color="#64748B" />
                    </View>
                    <Text style={styles.emptyRadarTitle}>Chưa tìm thấy ai ở gần</Text>
                    <Text style={styles.emptyRadarSubtitle}>
                      Đang liên tục rà quét thiết bị trong bán kính 20m...
                    </Text>
                    <ActivityIndicator
                      size="small"
                      color="#8B5CF6"
                      style={{ marginTop: 12 }}
                    />
                  </View>
                ) : (
                  <View style={styles.nearbyList}>
                    {candidateNearbyUsers.map((u) => {
                      const isSelected = selectedUserIds.includes(u.user_id);
                      return (
                        <TouchableOpacity
                          key={u.user_id}
                          style={[
                            styles.nearbyItem,
                            isSelected && styles.nearbyItemSelected,
                          ]}
                          onPress={() => toggleUserSelection(u.user_id)}
                          activeOpacity={0.75}
                        >
                          <View
                            style={[
                              styles.nearbyAvatar,
                              isSelected && styles.nearbyAvatarSelected,
                            ]}
                          >
                            <Text style={styles.nearbyAvatarText}>{u.avatar}</Text>
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.nearbyName,
                                isSelected && styles.nearbyNameSelected,
                              ]}
                            >
                              {u.name}
                            </Text>
                            <Text style={styles.nearbyDist}>
                              Cách ~{u.distanceMeters ?? 5}m
                            </Text>
                          </View>

                          {/* Checkbox Icon */}
                          <View style={styles.checkboxWrapper}>
                            <Ionicons
                              name={isSelected ? 'checkbox' : 'square-outline'}
                              size={22}
                              color={isSelected ? '#00A859' : '#64748B'}
                            />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Danh sách thành viên đã vào phòng chờ */}
              <View style={styles.roomMembersCard}>
                <Text style={styles.roomMembersTitle}>
                  Thành viên trong phòng ({members.length})
                </Text>
                <View style={styles.avatarRow}>
                  {members.map((m) => (
                    <View key={m.user_id} style={styles.memberAvatarBadge}>
                      <View
                        style={[
                          styles.memberAvatarCircle,
                          m.isHost && styles.hostAvatarBorder,
                        ]}
                      >
                        <Text style={styles.memberAvatarText}>{m.avatar}</Text>
                      </View>
                      <Text style={styles.memberAvatarName} numberOfLines={1}>
                        {m.isHost ? 'Chủ phòng' : m.name.split(' ').pop()}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Hướng Dẫn & Nút Lắc Kích Hoạt Chia Tiền */}
              <View style={styles.shakeActionBox}>
                <Animated.View
                  style={[
                    styles.shakeRadarPulse,
                    { transform: [{ scale: radarWaveAnim }] },
                  ]}
                />
                <TouchableOpacity
                  style={styles.shakeBigBtn}
                  onPress={handleHostTriggerSplit}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="vibrate" size={26} color="#FFFFFF" />
                  <Text style={styles.shakeBigBtnTitle}>
                    LẮC ĐIỆN THOẠI ĐỂ CHIA TIỀN
                  </Text>
                  <Text style={styles.shakeBigBtnSubtitle}>
                    Mỗi người thanh toán: ~${parsedSplitAmount.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* 2. HOST GIAI ĐOẠN WAITING: Quản lý trạng thái & Xác nhận thu tiền */
            <View style={styles.hostWaitingContainer}>
              {/* Thẻ Card Tổng Hợp Nổi Bật Thu Tiền Realtime */}
              <View style={styles.hostWaitingCard}>
                <View style={styles.hostRoleBadge}>
                  <MaterialCommunityIcons name="crown" size={14} color="#F59E0B" />
                  <Text style={styles.hostRoleText}>BẢNG QUẢN LÝ CHỦ PHÒNG</Text>
                </View>

                {/* Số tiền đã thu được Realtime (USD) */}
                <View style={styles.collectedSummaryBox}>
                  <Text style={styles.collectedLabel}>ĐÃ THU ĐƯỢC</Text>
                  <Text style={styles.collectedAmount}>
                    ${totalCollectedSoFar.toFixed(2)}{' '}
                    <Text style={styles.collectedCurrency}>USD</Text>
                  </Text>
                  <View style={styles.expectedTargetRow}>
                    <Text style={styles.expectedTargetText}>
                      Tổng cần thu:{' '}
                      <Text style={styles.expectedTargetBold}>
                        ${totalExpectedFromGuests.toFixed(2)}
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* Thanh Tiến độ thanh toán */}
                <View style={styles.progressBox}>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>Tiến độ thanh toán:</Text>
                    <Text style={styles.progressValue}>
                      {paidGuestsCount}/{guests.length} người đã trả
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${
                            guests.length > 0
                              ? (paidGuestsCount / guests.length) * 100
                              : 0
                          }%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Chi tiết chia tiền */}
                <View style={styles.billDetailsGrid}>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailColLabel}>Tổng hóa đơn</Text>
                    <Text style={styles.detailColValue}>
                      ${parsedTotalBill.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailCol}>
                    <Text style={styles.detailColLabel}>Phần mỗi người</Text>
                    <Text style={styles.detailColValueGreen}>
                      ${parsedSplitAmount.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Danh sách Guest & Trạng thái (Pending/Paid) */}
              <View style={styles.membersSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Danh sách thành viên ({guests.length})
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Đồng bộ trạng thái trực tiếp
                  </Text>
                </View>

                {guests.map((g) => (
                  <View key={g.user_id} style={styles.guestCard}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{g.avatar || 'U'}</Text>
                    </View>

                    <View style={styles.guestInfo}>
                      <Text style={styles.guestName}>{g.name}</Text>
                      <Text style={styles.guestShare}>
                        Số tiền: ${parsedSplitAmount.toFixed(2)}
                      </Text>
                    </View>

                    {g.status === 'paid' ? (
                      <View style={styles.paidBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#00A859" />
                        <Text style={styles.paidText}>Đã trả</Text>
                      </View>
                    ) : (
                      <View style={styles.pendingBadge}>
                        <Ionicons name="time-outline" size={15} color="#F59E0B" />
                        <Text style={styles.pendingText}>Đang chờ</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {/* Nút 'Xác nhận & Nhận tiền' (Chỉ bật khi toàn bộ Guest đã thanh toán) */}
              <TouchableOpacity
                style={[
                  styles.claimMoneyBtn,
                  !isAllPaid && styles.claimMoneyBtnDisabled,
                  isHostClaiming && styles.claimMoneyBtnLoading,
                ]}
                onPress={handleHostClaimAndClose}
                disabled={!isAllPaid || isHostClaiming}
                activeOpacity={0.85}
              >
                {isHostClaiming ? (
                  <View style={styles.payingLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.claimMoneyBtnText}>Đang hoàn tất...</Text>
                  </View>
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name={isAllPaid ? 'cash-check' : 'cash-clock'}
                      size={24}
                      color="#FFFFFF"
                    />
                    <Text style={styles.claimMoneyBtnText}>
                      {isAllPaid
                        ? `Xác nhận & Hoàn tất (+$${totalCollectedSoFar.toFixed(2)})`
                        : `Đang chờ thanh toán (${paidGuestsCount}/${guests.length})`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )
        ) : (
          /* ================================================================= */
          /* 🅱️ KHÔNG GIAN GUEST (NGƯỜI THAM GIA) */
          /* ================================================================= */
          guestPhase === 'WAITING_FOR_HOST' ? (
            /* 1. GUEST: Chờ Host chốt tiền và lắc */
            <View style={styles.guestWaitingContainer}>
              <View style={styles.guestWaitingCard}>
                <View style={styles.waitingRadarWrapper}>
                  <Animated.View
                    style={[
                      styles.guestRadarPulse,
                      { transform: [{ scale: radarWaveAnim }] },
                    ]}
                  />
                  <View style={styles.guestRadarCenter}>
                    <MaterialCommunityIcons name="cellphone-nfc" size={32} color="#FFFFFF" />
                  </View>
                </View>

                <Text style={styles.guestWaitingTitle}>Phòng chờ chia tiền</Text>
                <Text style={styles.guestWaitingDesc}>
                  Đang chờ người chủ trì{' '}
                  <Text style={styles.hostHighlightName}>
                    {hostName ? decodeURIComponent(hostName) : ''}
                  </Text>{' '}
                  chốt hóa đơn và lắc thiết bị... ⏳
                </Text>

                <View style={styles.guestNoteBox}>
                  <Ionicons name="information-circle-outline" size={18} color="#8B5CF6" />
                  <Text style={styles.guestNoteText}>
                    Khi người chủ trì lắc điện thoại, số tiền chia đều của bạn sẽ xuất hiện tại đây.
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            /* 2. GUEST: Đã nhận trigger_split -> Hiển thị số tiền & Nút Thanh Toán */
            <View style={styles.guestPayContainer}>
              <View style={styles.guestBillCard}>
                <View style={styles.guestCardHeader}>
                  <MaterialCommunityIcons
                    name="receipt-text-check-outline"
                    size={28}
                    color="#8B5CF6"
                  />
                  <Text style={styles.guestCardTitle}>Chi tiết hóa đơn</Text>
                </View>

                <Text style={styles.guestInvitedBy}>
                  Người chủ trì{' '}
                  <Text style={styles.hostHighlightName}>
                    {hostName ? decodeURIComponent(hostName) : ''}
                  </Text>{' '}
                  đã chốt số tiền
                </Text>

                {/* Số tiền chính xác (USD) */}
                <View style={styles.exactAmountBox}>
                  <Text style={styles.exactAmountLabel}>Số tiền bạn cần thanh toán:</Text>
                  <Text style={styles.exactAmountValue}>
                    ${parsedSplitAmount.toFixed(2)}{' '}
                    <Text style={styles.exactCurrency}>USD</Text>
                  </Text>
                  <Text style={styles.noteDesc}>
                    Ghi chú: {billNote || 'Ăn uống nhóm'}
                  </Text>
                </View>

                <View style={styles.totalContextBox}>
                  <Text style={styles.totalContextText}>
                    Tổng hóa đơn phòng: ${parsedTotalBill.toFixed(2)} USD
                  </Text>
                </View>
              </View>

              {/* Nút Thanh toán nổi bật */}
              <TouchableOpacity
                style={[
                  styles.guestPayBtn,
                  hasGuestPaid && styles.guestPayBtnPaid,
                  isGuestPaying && styles.guestPayBtnLoading,
                ]}
                onPress={handleGuestPay}
                disabled={isGuestPaying || hasGuestPaid}
                activeOpacity={0.85}
              >
                {hasGuestPaid ? (
                  <>
                    <Ionicons name="checkmark-done-circle" size={22} color="#FFFFFF" />
                    <Text style={styles.guestPayBtnText}>Đã thanh toán thành công</Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="lightning-bolt" size={22} color="#FFFFFF" />
                    <Text style={styles.guestPayBtnText}>
                      Thanh toán ${parsedSplitAmount.toFixed(2)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {hasGuestPaid && (
                <View style={styles.paidConfirmationBox}>
                  <Ionicons name="shield-checkmark" size={18} color="#00A859" />
                  <Text style={styles.paidConfirmationText}>
                    Đã hoàn tất thanh toán và đồng bộ đến người chủ trì!
                  </Text>
                </View>
              )}
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#334155',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 18,
    textAlign: 'center',
  },
  loadingCardSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 19,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  roomIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 2,
  },
  roomIdText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Host SETUP Styles
  hostSetupContainer: {
    gap: 16,
  },
  billInputCard: {
    backgroundColor: '#1E293B',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#334155',
    marginBottom: 10,
  },
  currencyPrefix: {
    fontSize: 24,
    fontWeight: '800',
    color: '#8B5CF6',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
    color: '#00A859',
    padding: 0,
  },
  currencySuffix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetPillActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  presetText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  presetTextActive: {
    color: '#FFFFFF',
  },
  noteInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#334155',
  },
  noteInput: {
    flex: 1,
    fontSize: 13,
    color: '#F8FAFC',
    padding: 0,
  },
  nearbySectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nearbyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  nearbySubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  inviteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
  },
  inviteActionBtnDisabled: {
    opacity: 0.4,
    backgroundColor: '#475569',
  },
  inviteActionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyRadarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyRadarIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyRadarTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  emptyRadarSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  nearbyList: {
    gap: 8,
  },
  nearbyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  nearbyItemSelected: {
    borderColor: '#00A859',
    backgroundColor: 'rgba(0, 168, 89, 0.08)',
  },
  nearbyAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  nearbyAvatarSelected: {
    backgroundColor: '#00A859',
  },
  nearbyAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nearbyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  nearbyNameSelected: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  nearbyDist: {
    fontSize: 11.5,
    color: '#00A859',
    marginTop: 2,
  },
  checkboxWrapper: {
    paddingLeft: 8,
  },
  roomMembersCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  roomMembersTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  memberAvatarBadge: {
    alignItems: 'center',
    width: 54,
  },
  memberAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00A859',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  hostAvatarBorder: {
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  memberAvatarName: {
    fontSize: 11,
    color: '#CBD5E1',
    textAlign: 'center',
  },
  shakeActionBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  shakeRadarPulse: {
    position: 'absolute',
    width: '100%',
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  shakeBigBtn: {
    width: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  shakeBigBtnTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  shakeBigBtnSubtitle: {
    fontSize: 13,
    color: '#EDE9FE',
    marginTop: 2,
    fontWeight: '600',
  },
  // Host WAITING Styles
  hostWaitingContainer: {
    gap: 16,
  },
  hostWaitingCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
  },
  hostRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14,
  },
  hostRoleText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#F59E0B',
  },
  collectedSummaryBox: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 168, 89, 0.3)',
    marginBottom: 16,
  },
  collectedLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 6,
  },
  collectedAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: '#00A859',
  },
  collectedCurrency: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94A3B8',
  },
  expectedTargetRow: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  expectedTargetText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  expectedTargetBold: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  progressBox: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12.5,
    color: '#94A3B8',
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00A859',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00A859',
    borderRadius: 4,
  },
  billDetailsGrid: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailCol: {
    flex: 1,
    alignItems: 'center',
  },
  detailColLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  detailColValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  detailColValueGreen: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00A859',
  },
  detailDivider: {
    width: 1,
    backgroundColor: '#334155',
  },
  membersSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  guestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#00A859',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  guestShare: {
    fontSize: 12.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 168, 89, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 89, 0.4)',
  },
  paidText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#00A859',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  pendingText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#F59E0B',
  },
  claimMoneyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#00A859',
    borderRadius: 18,
    paddingVertical: 18,
    marginTop: 6,
    marginBottom: 24,
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  claimMoneyBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  claimMoneyBtnLoading: {
    opacity: 0.8,
  },
  claimMoneyBtnText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  payingLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Guest WAITING Styles
  guestWaitingContainer: {
    paddingTop: 20,
  },
  guestWaitingCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  waitingRadarWrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  guestRadarPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  guestRadarCenter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestWaitingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  guestWaitingDesc: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  hostHighlightName: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  guestNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  guestNoteText: {
    flex: 1,
    fontSize: 12.5,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  // Guest PAY Styles
  guestPayContainer: {
    paddingTop: 8,
  },
  guestBillCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#334155',
    marginBottom: 20,
    alignItems: 'center',
  },
  guestCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  guestCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  guestInvitedBy: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 18,
  },
  exactAmountBox: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    marginBottom: 14,
  },
  exactAmountLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 6,
  },
  exactAmountValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#8B5CF6',
  },
  exactCurrency: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94A3B8',
  },
  noteDesc: {
    fontSize: 13,
    color: '#CBD5E1',
    marginTop: 8,
    fontStyle: 'italic',
  },
  totalContextBox: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalContextText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  guestPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00A859',
    borderRadius: 18,
    paddingVertical: 16,
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  guestPayBtnPaid: {
    backgroundColor: '#10B981',
    opacity: 0.8,
  },
  guestPayBtnLoading: {
    opacity: 0.8,
  },
  guestPayBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  paidConfirmationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 168, 89, 0.12)',
    padding: 14,
    borderRadius: 14,
    marginTop: 14,
  },
  paidConfirmationText: {
    fontSize: 13,
    color: '#00A859',
    fontWeight: '700',
    textAlign: 'center',
  },
});
