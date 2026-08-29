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
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Accelerometer } from 'expo-sensors';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { supabase } from '@/services/supabase';
import { useGlobalPresence, PresenceUser } from '@/contexts/GlobalPresenceContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface RoomMember {
  user_id: string;
  name: string;
  avatar: string;
  wallet_address?: string;
  isHost: boolean;
  status: 'pending' | 'paid';
}

export default function ShakeRoomScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{
    roomId: string;
    isHost?: string;
    hostId?: string;
    hostName?: string;
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

  // Host Phases: 'SETUP' (Nhập tiền, mời bạn bè & lắc) | 'WAITING' (Quản lý chờ thanh toán)
  const [hostPhase, setHostPhase] = useState<'SETUP' | 'WAITING'>('SETUP');

  // Guest Phases: 'WAITING_FOR_HOST' (Chờ Host lắc) | 'READY_TO_PAY' (Đã nhận trigger_split)
  const [guestPhase, setGuestPhase] = useState<'WAITING_FOR_HOST' | 'READY_TO_PAY'>(
    searchParams.splitAmount && parseInt(searchParams.splitAmount) > 0
      ? 'READY_TO_PAY'
      : 'WAITING_FOR_HOST'
  );

  // State Hóa đơn
  const [totalBill, setTotalBill] = useState(searchParams.totalBill || '200000');
  const [splitAmount, setSplitAmount] = useState(searchParams.splitAmount || '0');
  const [billNote, setBillNote] = useState(
    searchParams.note ? decodeURIComponent(searchParams.note) : 'Ăn trưa nhóm'
  );

  // State Thành viên phòng
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [isInvitingNearby, setIsInvitingNearby] = useState(false);

  // State Thanh toán Guest
  const [isGuestPaying, setIsGuestPaying] = useState(false);
  const [hasGuestPaid, setHasGuestPaid] = useState(false);

  // Refs & Animations
  const roomChannelRef = useRef<RealtimeChannel | null>(null);
  const accelerometerSubRef = useRef<any>(null);
  const lastShakeTimeRef = useRef(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarWaveAnim = useRef(new Animated.Value(1)).current;
  const waitingBounceAnim = useRef(new Animated.Value(1)).current;

  // Lấy địa chỉ ví Solana
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

  // Lọc bạn bè trong bán kính 20m từ global_radar
  const liveNearbyIn20m = nearbyUsers.filter(
    (u) => u.distanceMeters !== undefined && u.distanceMeters <= 20
  );
  const demoFallbackPeers: PresenceUser[] = [
    { user_id: 'demo_peer_1', name: 'Nguyễn Văn Nam', avatar: 'N', lat: 0, lng: 0, distanceMeters: 3 },
    { user_id: 'demo_peer_2', name: 'Lê Thị Mai', avatar: 'M', lat: 0, lng: 0, distanceMeters: 8 },
    { user_id: 'demo_peer_3', name: 'Trần Hoàng', avatar: 'H', lat: 0, lng: 0, distanceMeters: 14 },
  ];
  const candidateNearbyUsers =
    liveNearbyIn20m.length > 0 ? liveNearbyIn20m : demoFallbackPeers;

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

    Animated.loop(
      Animated.sequence([
        Animated.timing(waitingBounceAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(waitingBounceAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
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
      name: currentUserProfile.name || 'Người dùng',
      avatar: currentUserProfile.avatar || 'U',
      wallet_address: getSolanaAddress() || undefined,
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

        setMembers((prev) => {
          const paidIds = new Set(
            prev.filter((m) => m.status === 'paid').map((m) => m.user_id)
          );
          const baseList = presenceList.length > 0 ? presenceList : [myProfile];
          return baseList.map((m) => ({
            ...m,
            status: m.isHost || paidIds.has(m.user_id) ? 'paid' : m.status || 'pending',
          }));
        });
      })
      // B. Event trigger_split: Guest nhận lệnh chia tiền từ Host
      .on('broadcast', { event: 'trigger_split' }, ({ payload }) => {
        console.log('⚡ [Shake Room] Nhận sự kiện trigger_split:', payload);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (payload?.total_bill) setTotalBill(payload.total_bill.toString());
        if (payload?.split_amount) setSplitAmount(payload.split_amount.toString());
        if (payload?.note) setBillNote(payload.note);

        if (!isHost) {
          setGuestPhase('READY_TO_PAY');
        }
      })
      // C. Event payment_update: Host nhận thông báo Guest đã thanh toán
      .on('broadcast', { event: 'payment_update' }, ({ payload }) => {
        console.log('💰 [Shake Room] Nhận sự kiện payment_update:', payload);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setMembers((prev) =>
          prev.map((m) => (m.user_id === payload.user_id ? { ...m, status: 'paid' } : m))
        );
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
        supabase.removeChannel(roomChannelRef.current);
        roomChannelRef.current = null;
      }
    };
  }, [roomId, user, isHost]);

  // Host: Thêm các mock guest ban đầu nếu phòng chưa có realtime peer (để trải nghiệm)
  useEffect(() => {
    if (isHost && members.length === 0) {
      setMembers([
        {
          user_id: user?.id || 'host',
          name: currentUserProfile.name || 'Tôi (Host)',
          avatar: currentUserProfile.avatar || 'Đ',
          isHost: true,
          status: 'paid',
        },
        {
          user_id: 'demo_peer_1',
          name: 'Nguyễn Văn Nam',
          avatar: 'N',
          isHost: false,
          status: 'pending',
        },
        {
          user_id: 'demo_peer_2',
          name: 'Lê Thị Mai',
          avatar: 'M',
          isHost: false,
          status: 'pending',
        },
      ]);
    }
  }, [isHost]);

  // 2. Logic Lắc thiết bị (Shake Trigger) cho Host trong Phase SETUP
  const handleHostTriggerSplit = async () => {
    const bill = parseFloat(totalBill.replace(/,/g, '')) || 0;
    if (bill <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Chưa nhập số tiền', 'Vui lòng nhập tổng số tiền hóa đơn trước khi lắc chia tiền.');
      return;
    }

    const totalCount = Math.max(members.length, 2);
    const calculatedSplit = Math.round(bill / totalCount);
    setSplitAmount(calculatedSplit.toString());

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log('🚀 [Host] Chốt chia tiền & phát sóng trigger_split:', {
      totalBill: bill,
      splitAmount: calculatedSplit,
      membersCount: totalCount,
    });

    // Bắn event trigger_split vào channel room_[roomId]
    if (roomChannelRef.current) {
      try {
        await roomChannelRef.current.send({
          type: 'broadcast',
          event: 'trigger_split',
          payload: {
            room_id: roomId,
            total_bill: bill,
            split_amount: calculatedSplit,
            note: billNote,
          },
        });
      } catch (e) {
        console.error('Lỗi khi gửi trigger_split:', e);
      }
    }

    // Đổi giao diện Host sang trạng thái 'WAITING'
    setHostPhase('WAITING');

    // Tắt Accelerometer listener
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
  }, [isHost, hostPhase, totalBill, members, billNote]);

  // Host: Mời bạn bè xung quanh vào phòng qua global_radar
  const handleInviteNearbyFriends = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsInvitingNearby(true);

    const targetIds = candidateNearbyUsers.map((u) => u.user_id);
    const bill = parseFloat(totalBill.replace(/,/g, '')) || 0;

    try {
      await broadcastInvite(roomId, targetIds, {
        totalBill: bill,
        note: billNote,
      });
      setIsInvitingNearby(false);
      Alert.alert(
        'Đã phát lời mời 🎉',
        `Đã gửi lời mời tới ${targetIds.length} bạn bè xung quanh trong bán kính 20m!`
      );
    } catch (e) {
      setIsInvitingNearby(false);
      Alert.alert('Lỗi', 'Không thể gửi lời mời. Vui lòng thử lại.');
    }
  };

  // Guest: Thực hiện thanh toán phần chia
  const handleGuestPay = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsGuestPaying(true);

    try {
      setTimeout(async () => {
        setIsGuestPaying(false);
        setHasGuestPaid(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (roomChannelRef.current && user) {
          await roomChannelRef.current.send({
            type: 'broadcast',
            event: 'payment_update',
            payload: {
              user_id: user.id,
              name: currentUserProfile.name,
              status: 'paid',
              amount: parseInt(splitAmount) || 0,
              paid_at: new Date().toISOString(),
            },
          });
        }

        Alert.alert(
          'Thanh toán thành công 🎉',
          `Bạn đã thanh toán ${parseInt(splitAmount).toLocaleString()} đ thành công tới Host!`
        );
      }, 1200);
    } catch (e) {
      setIsGuestPaying(false);
      Alert.alert('Lỗi', 'Không thể hoàn tất thanh toán. Vui lòng thử lại.');
    }
  };

  const copyRoomId = async () => {
    if (!roomId) return;
    await Clipboard.setStringAsync(roomId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Đã sao chép mã phòng', roomId);
  };

  // Tính toán số lượng đã thanh toán phía Host
  const guests = members.filter((m) => !m.isHost);
  const paidGuestsCount = guests.filter((m) => m.status === 'paid').length;
  const totalGuestsCount = Math.max(guests.length, 1);
  const isAllPaid = paidGuestsCount === totalGuestsCount && guests.length > 0;

  const parsedTotalBill = parseFloat(totalBill.replace(/,/g, '')) || 0;
  const parsedSplitAmount =
    parseFloat(splitAmount.replace(/,/g, '')) ||
    Math.round(parsedTotalBill / Math.max(members.length, 2));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

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
          <Text style={styles.headerTitle}>Phòng giao dịch ảo</Text>
          <TouchableOpacity
            style={styles.roomIdBadge}
            onPress={copyRoomId}
            activeOpacity={0.7}
          >
            <Text style={styles.roomIdText}>MÃ PHÒNG: #{roomId || 'RADAR'}</Text>
            <Feather name="copy" size={12} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <View style={styles.liveIndicator}>
          <Animated.View
            style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]}
          />
          <Text style={styles.liveText}>LIVE</Text>
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
            /* 1. HOST GIAI ĐOẠN SETUP: Nhập tiền, Mời bạn bè & Lắc */
            <View style={styles.hostSetupContainer}>
              {/* Thẻ Nhập Tiền Hóa Đơn */}
              <View style={styles.billInputCard}>
                <View style={styles.cardHeaderRow}>
                  <MaterialCommunityIcons name="receipt" size={22} color="#8B5CF6" />
                  <Text style={styles.cardHeaderTitle}>Nhập Tổng Hóa Đơn Cần Chia</Text>
                </View>

                <View style={styles.amountInputRow}>
                  <Text style={styles.currencyPrefix}>đ</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={totalBill}
                    onChangeText={setTotalBill}
                    placeholder="0"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                  <Text style={styles.currencySuffix}>VND</Text>
                </View>

                {/* Phím preset nhanh */}
                <View style={styles.presetRow}>
                  {['100000', '200000', '500000', '1000000'].map((preset) => (
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
                        {parseInt(preset) >= 1000000
                          ? `${parseInt(preset) / 1000000}M`
                          : `${parseInt(preset) / 1000}k`}
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
                    placeholder="Ghi chú hóa đơn (VD: Ăn trưa nhóm)"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>

              {/* Thẻ Quét & Mời Bạn Bè Xung Quanh (20m) */}
              <View style={styles.nearbySectionCard}>
                <View style={styles.sectionHeaderBetween}>
                  <View>
                    <Text style={styles.nearbyTitle}>
                      Bạn bè xung quanh (20m)
                    </Text>
                    <Text style={styles.nearbySubtitle}>
                      Tìm thấy {candidateNearbyUsers.length} thiết bị
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.inviteAllBtn}
                    onPress={handleInviteNearbyFriends}
                    disabled={isInvitingNearby}
                    activeOpacity={0.8}
                  >
                    {isInvitingNearby ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="paper-plane" size={14} color="#FFFFFF" />
                        <Text style={styles.inviteAllBtnText}>Mời tất cả</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Danh sách người dùng lân cận */}
                <View style={styles.nearbyList}>
                  {candidateNearbyUsers.map((u) => (
                    <View key={u.user_id} style={styles.nearbyItem}>
                      <View style={styles.nearbyAvatar}>
                        <Text style={styles.nearbyAvatarText}>{u.avatar}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.nearbyName}>{u.name}</Text>
                        <Text style={styles.nearbyDist}>
                          Cách bạn ~{u.distanceMeters ?? 5}m
                        </Text>
                      </View>
                      <View style={styles.nearbyStatusPill}>
                        <Text style={styles.nearbyStatusText}>Lân cận</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Danh sách thành viên đã vào phòng chờ */}
              <View style={styles.roomMembersCard}>
                <Text style={styles.roomMembersTitle}>
                  Thành viên trong phòng chờ ({members.length})
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
                        {m.isHost ? 'Host' : m.name.split(' ').pop()}
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
                    LẮC ĐIỆN THOẠI ĐỂ CHỐT CHIA TIỀN
                  </Text>
                  <Text style={styles.shakeBigBtnSubtitle}>
                    Mỗi người đóng: ~{parsedSplitAmount.toLocaleString()} đ
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* 2. HOST GIAI ĐOẠN WAITING: Quản lý trạng thái thanh toán */
            <View style={styles.hostWaitingContainer}>
              <View style={styles.hostWaitingCard}>
                <View style={styles.hostRoleBadge}>
                  <MaterialCommunityIcons name="crown" size={14} color="#F59E0B" />
                  <Text style={styles.hostRoleText}>BẠN LÀ HOST CHỦ TRÌ</Text>
                </View>

                <Animated.View
                  style={[
                    styles.waitingStatusWrapper,
                    { transform: [{ scale: waitingBounceAnim }] },
                  ]}
                >
                  <Text style={styles.waitingStatusText}>
                    {isAllPaid ? 'Đã thu đủ tiền! 🎉' : 'Waiting...'}
                  </Text>
                </Animated.View>

                <Text style={styles.waitingSubText}>
                  {isAllPaid
                    ? 'Tất cả bạn bè đã hoàn tất thanh toán hóa đơn.'
                    : 'Đang chờ các thành viên xác nhận và gửi tiền.'}
                </Text>

                {/* Tiến độ */}
                <View style={styles.progressBox}>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>Tiến độ thanh toán:</Text>
                    <Text style={styles.progressValue}>
                      {paidGuestsCount}/{totalGuestsCount} bạn bè đã trả
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${(paidGuestsCount / totalGuestsCount) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Tổng kết hóa đơn */}
                <View style={styles.billDetailsGrid}>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailColLabel}>Tổng hóa đơn</Text>
                    <Text style={styles.detailColValue}>
                      {parsedTotalBill.toLocaleString()} đ
                    </Text>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailCol}>
                    <Text style={styles.detailColLabel}>Mỗi người đóng</Text>
                    <Text style={styles.detailColValueGreen}>
                      {parsedSplitAmount.toLocaleString()} đ
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
                    Realtime cập nhật qua channel room_{roomId}
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
                        Phần chia: {parsedSplitAmount.toLocaleString()} đ
                      </Text>
                    </View>

                    {g.status === 'paid' ? (
                      <View style={styles.paidBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#00A859" />
                        <Text style={styles.paidText}>Paid</Text>
                      </View>
                    ) : (
                      <View style={styles.pendingBadge}>
                        <Ionicons name="time-outline" size={15} color="#F59E0B" />
                        <Text style={styles.pendingText}>Pending</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
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

                <Text style={styles.guestWaitingTitle}>Phòng Chờ Shake to Split</Text>
                <Text style={styles.guestWaitingDesc}>
                  Đang chờ Host{' '}
                  <Text style={styles.hostHighlightName}>
                    {hostName ? decodeURIComponent(hostName) : 'chủ trì'}
                  </Text>{' '}
                  chốt hóa đơn và lắc thiết bị... ⏳
                </Text>

                <View style={styles.guestNoteBox}>
                  <Ionicons name="information-circle-outline" size={18} color="#8B5CF6" />
                  <Text style={styles.guestNoteText}>
                    Khi Host lắc thiết bị, số tiền cần chia sẽ tự động hiển thị trên màn hình của bạn.
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
                  <Text style={styles.guestCardTitle}>Hóa Đơn Chia Tiền</Text>
                </View>

                <Text style={styles.guestInvitedBy}>
                  Host{' '}
                  <Text style={styles.hostHighlightName}>
                    {hostName ? decodeURIComponent(hostName) : 'Chủ trì'}
                  </Text>{' '}
                  vừa chốt hóa đơn chia tiền
                </Text>

                {/* Số tiền chính xác */}
                <View style={styles.exactAmountBox}>
                  <Text style={styles.exactAmountLabel}>Số tiền bạn cần đóng:</Text>
                  <Text style={styles.exactAmountValue}>
                    {parsedSplitAmount.toLocaleString()} <Text style={styles.exactCurrency}>VND</Text>
                  </Text>
                  <Text style={styles.noteDesc}>
                    Ghi chú: {billNote || 'Ăn trưa nhóm'}
                  </Text>
                </View>

                <View style={styles.totalContextBox}>
                  <Text style={styles.totalContextText}>
                    Tổng hóa đơn phòng: {parsedTotalBill.toLocaleString()} đ
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
                {isGuestPaying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : hasGuestPaid ? (
                  <>
                    <Ionicons name="checkmark-done-circle" size={22} color="#FFFFFF" />
                    <Text style={styles.guestPayBtnText}>Đã thanh toán</Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="lightning-bolt" size={22} color="#FFFFFF" />
                    <Text style={styles.guestPayBtnText}>
                      Thanh toán {parsedSplitAmount.toLocaleString()} đ
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {hasGuestPaid && (
                <View style={styles.paidConfirmationBox}>
                  <Ionicons name="shield-checkmark" size={18} color="#00A859" />
                  <Text style={styles.paidConfirmationText}>
                    Trạng thái đã được cập nhật về màn hình Host thời gian thực!
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
    fontSize: 22,
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
    paddingVertical: 7,
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
    fontSize: 12.5,
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
  inviteAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  inviteAllBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nearbyList: {
    gap: 8,
  },
  nearbyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  nearbyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  nearbyAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nearbyName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  nearbyDist: {
    fontSize: 11.5,
    color: '#00A859',
    marginTop: 1,
  },
  nearbyStatusPill: {
    backgroundColor: 'rgba(0, 168, 89, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  nearbyStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00A859',
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
  waitingStatusWrapper: {
    marginVertical: 4,
  },
  waitingStatusText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  waitingSubText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
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
    marginBottom: 4,
  },
  detailColValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  detailColValueGreen: {
    fontSize: 17,
    fontWeight: '800',
    color: '#00A859',
  },
  detailDivider: {
    width: 1,
    backgroundColor: '#334155',
  },
  membersSection: {
    marginBottom: 20,
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
    opacity: 0.7,
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
    gap: 6,
    backgroundColor: 'rgba(0, 168, 89, 0.12)',
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  paidConfirmationText: {
    fontSize: 12.5,
    color: '#00A859',
    fontWeight: '600',
    textAlign: 'center',
  },
});
