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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Accelerometer } from 'expo-sensors';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { cacheActivities, getCachedActivities } from '@/services/storage';
import { ActivityItem, formatFiatBalance, USD_TO_VND_RATE } from '@/services/solana';
import { useGlobalPresence } from '@/contexts/GlobalPresenceContext';
import { useOnchainTransfer } from '@/hooks/useOnchainTransfer';
import { WalletRecoveryModal } from '../components/WalletRecoveryModal';

// Tỷ giá quy đổi giả định: 1 SOL = $150 USD
const SOL_USD_RATE = 150;

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
  const { nearbyUsers, broadcastInvite, currentUserProfile } = useGlobalPresence();

  // Xác định vai trò: Host hay Guest
  const isHost = Boolean(
    searchParams.isHost === 'true' ||
    !hostId ||
    (user?.id && hostId && user.id === hostId)
  );

  // Lưu địa chỉ ví On-chain của Host
  const [hostWalletAddress, setHostWalletAddress] = useState<string>(
    searchParams.hostWallet ? decodeURIComponent(searchParams.hostWallet) : ''
  );

  // Host Phases: 'SETUP' (Nhập tiền & Quét/Lắc) | 'WAITING' (Quản lý chờ thành viên thanh toán)
  const [hostPhase, setHostPhase] = useState<'SETUP' | 'WAITING'>('SETUP');

  // Guest Phases: 'WAITING_FOR_HOST' (Chờ Host lắc) | 'READY_TO_PAY' (Đã nhận trigger chia tiền)
  const [guestPhase, setGuestPhase] = useState<'WAITING_FOR_HOST' | 'READY_TO_PAY'>(
    searchParams.splitAmount && parseFloat(searchParams.splitAmount) > 0
      ? 'READY_TO_PAY'
      : 'WAITING_FOR_HOST'
  );

  // State Hóa đơn (Định dạng Dollar USD theo yêu cầu: TextInput tự do, không nút cố định)
  const [totalBill, setTotalBill] = useState(searchParams.totalBill || '100');
  const [splitAmount, setSplitAmount] = useState(searchParams.splitAmount || '0');
  const [billNote, setBillNote] = useState(
    searchParams.note ? decodeURIComponent(searchParams.note) : 'Group Lunch'
  );

  // State Thành viên phòng
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [isInvitingNearby, setIsInvitingNearby] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

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

  // Lọc bạn bè thực tế trong bán kính 20m từ Global Presence
  const candidateNearbyUsers = nearbyUsers.filter(
    (u) => u.distanceMeters !== undefined && u.distanceMeters <= 20
  );

  // Tự động đồng bộ danh sách đã chọn khi có thiết bị mới
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

  const toggleUserSelection = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

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

  // Logic Kích hoạt Chia Tiền (Shake Trigger / Nút bấm)
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
    setHostPhase('WAITING');

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
  }, [isHost, hostPhase, totalBill, members, billNote, selectedUserIds, mySolanaAddress]);

  // Host: Mời bạn bè qua Global Presence
  const handleInviteNearbyFriends = async () => {
    if (selectedUserIds.length === 0) {
      handleShareRoomCode();
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

      Alert.alert('Thành công! 🎉', `Đã thanh toán on-chain thành công!\nTx: ${txSignature.slice(0, 16)}...`);
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
      <StatusBar barStyle="dark-content" backgroundColor="#BFA3EC" />

      {/* Loading Overlay khi giao dịch đang xử lý */}
      {(isGuestPaying || isExecutingTransfer) && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay, { zIndex: 9999 }]}>
          <NeoCard
            backgroundColor="#FFFFFF"
            shadowColor="#000000"
            borderRadius={22}
            borderWidth={2.5}
            offset={4}
            containerStyle={{ width: '85%' }}
            style={{ alignItems: 'center', padding: 24 }}
          >
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingCardTitle}>
              {transferStatusMessage || 'Đang xử lý thanh toán on-chain...'}
            </Text>
            <Text style={styles.loadingCardSubtitle}>
              Vui lòng giữ ứng dụng và không đóng màn hình
            </Text>
          </NeoCard>
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

            {/* Scrollable Content */}
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ========================================================= */}
              {/* 2. KHU VỰC NHẬP HÓA ĐƠN (TEXTINPUT LỚN + GHI CHÚ VIÊN THUỐC) */}
              {/* ========================================================= */}
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

              {/* ========================================================= */}
              {/* 3. THẺ RADAR & THÀNH VIÊN (KHỐI TRUNG TÂM LỚN #FDF8F0) */}
              {/* ========================================================= */}
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

                {/* Phần giữa của Card: Icon Radar / Vòng tròn đồng tâm nghệ thuật */}
                <View style={styles.radarSection}>
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
                            {/* Icon Target / Radar đồng tâm theo chuẩn thiết kế */}
                            <MaterialCommunityIcons
                              name="target"
                              size={36}
                              color="#6B4F3A"
                            />
                          </View>
                        </View>
                      </View>
                    </Animated.View>
                  </TouchableOpacity>

                  <Text style={styles.scanningText}>
                    {candidateNearbyUsers.length > 0
                      ? `Đã tìm thấy ${candidateNearbyUsers.length} bạn bè ở gần`
                      : 'Scanning for friends ...'}
                  </Text>

                  {/* Danh sách người ở gần (nếu tìm thấy) */}
                  {candidateNearbyUsers.length > 0 && isHost && hostPhase === 'SETUP' && (
                    <View style={styles.nearbyListRow}>
                      {candidateNearbyUsers.map((u) => {
                        const isSelected = selectedUserIds.includes(u.user_id);
                        return (
                          <TouchableOpacity
                            key={u.user_id}
                            style={[
                              styles.nearbySelectPill,
                              isSelected && styles.nearbySelectPillActive,
                            ]}
                            onPress={() => toggleUserSelection(u.user_id)}
                            activeOpacity={0.75}
                          >
                            <Text
                              style={[
                                styles.nearbySelectText,
                                isSelected && styles.nearbySelectTextActive,
                              ]}
                            >
                              {u.name} {isSelected ? '✓' : '+'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
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
                    {/* 1. Host Avatar (Viền đỏ, chữ H in đậm) */}
                    <View style={styles.avatarItemCol}>
                      <View style={styles.hostAvatarCircle}>
                        <Text style={styles.hostAvatarLetter}>
                          {currentUserProfile?.avatar || 'H'}
                        </Text>
                      </View>
                      <Text style={styles.avatarSubLabel}>Host</Text>
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
                          <Text style={styles.guestAvatarLetter}>{g.avatar || 'U'}</Text>
                        </View>
                        <Text style={styles.avatarSubLabel} numberOfLines={1}>
                          {g.name.split(' ').pop()}
                        </Text>
                      </View>
                    ))}

                    {/* 3. Nút "+ Invite" (Viền nét đứt) */}
                    <TouchableOpacity
                      style={styles.avatarItemCol}
                      onPress={handleInviteNearbyFriends}
                      activeOpacity={0.75}
                    >
                      <View style={styles.inviteDashedCircle}>
                        <Feather name="plus" size={18} color="#000000" />
                      </View>
                      <Text style={styles.avatarSubLabel}>+ Invite</Text>
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
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <WalletRecoveryModal
        visible={showRecoveryModal || needsRecovery}
        onClose={() => setShowRecoveryModal(false)}
        onSuccess={() => setShowRecoveryModal(false)}
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    marginTop: 14,
    textAlign: 'center',
  },
  loadingCardSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
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
  nearbyListRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  nearbySelectPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  nearbySelectPillActive: {
    backgroundColor: '#8B5CF6',
  },
  nearbySelectText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#000000',
  },
  nearbySelectTextActive: {
    color: '#FFFFFF',
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

});
