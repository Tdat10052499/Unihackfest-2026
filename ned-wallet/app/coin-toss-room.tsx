import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { supabase } from '../services/supabase';
import { getSolanaBalance } from '../services/solana';
import { useOnchainTransfer } from '../hooks/useOnchainTransfer';
import { useGlobalPresence } from '../contexts/GlobalPresenceContext';
import { WalletRecoveryModal } from '../components/WalletRecoveryModal';
import type { RealtimeChannel } from '@supabase/supabase-js';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RoomMember {
  user_id: string;
  name: string;
  avatar: string;
  wallet_address?: string;
  is_host?: boolean;
  joined_at?: number;
}

export default function CoinTossRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const roomId = (params.roomId as string) || 'coin_demo';
  const isHost = String(params.isHost) === 'true';

  const { user } = usePrivy();
  const solanaWalletState = useEmbeddedSolanaWallet();
  const { nearbyUsers, broadcastInvite } = useGlobalPresence();

  const {
    transfer,
    isTransferring,
    isWalletReady,
    needsRecovery,
    walletStatus,
    statusMessage,
  } = useOnchainTransfer();

  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);

  // Danh sách thành viên trong phòng Realtime
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [amount, setAmount] = useState('0.005');
  const [solBalance, setSolBalance] = useState<number | null>(null);

  // Trạng thái Tung Đồng Xu
  const [isTossing, setIsTossing] = useState(false);
  const [tossStatusText, setTossStatusText] = useState('Vuốt đồng xu lên trên để lì xì');
  const [winner, setWinner] = useState<RoomMember | null>(null);
  const [wonAmount, setWonAmount] = useState<number | null>(null);
  const [lastTxSignature, setLastTxSignature] = useState<string | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);

  // Reanimated Shared Values cho Đồng Xu
  const coinTranslateY = useSharedValue(0);
  const coinScale = useSharedValue(1);
  const coinOpacity = useSharedValue(1);
  const coinRotateY = useSharedValue(0);
  const coinGlowScale = useSharedValue(1);
  const coinGlowOpacity = useSharedValue(0.4);
  const winnerModalScale = useSharedValue(0.3);

  // Lấy địa chỉ ví người dùng
  const getMySolanaAddress = (): string | null => {
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

  const myAddress = getMySolanaAddress();

  // Lấy tên hiển thị của người dùng
  const getMyProfile = () => {
    if (!user) return { name: 'Người chơi', avatar: 'U' };
    const googleAcc =
      (user as any)?.google ||
      (user as any)?.linked_accounts?.find((a: any) => a.type === 'google_oauth' || a.type === 'google');
    const emailAcc = (user as any)?.email;

    const name =
      googleAcc?.name ||
      (googleAcc?.email ? googleAcc.email.split('@')[0] : null) ||
      (emailAcc?.address ? emailAcc.address.split('@')[0] : 'Người chơi');

    const avatar = name.charAt(0).toUpperCase();
    return { name, avatar };
  };

  const myProfile = useMemo(() => getMyProfile(), [user]);

  // Nạp số dư SOL
  useEffect(() => {
    if (myAddress) {
      getSolanaBalance(myAddress).then(setSolBalance).catch(console.log);
    }
  }, [myAddress]);

  // Vòng sáng hào quang nhịp thở (Glow Pulse)
  useEffect(() => {
    coinGlowScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1400 }),
        withTiming(0.95, { duration: 1400 })
      ),
      -1,
      true
    );
    coinGlowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 1400 }),
        withTiming(0.35, { duration: 1400 })
      ),
      -1,
      true
    );
  }, []);

  // Haptic feedback helpers cho Worklet
  const triggerHapticLight = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const triggerHapticHeavy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const triggerHapticSuccess = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // 1. KẾT NỐI SUPABASE REALTIME PRESENCE VÀ BROADCAST CHANNEL
  useEffect(() => {
    if (!user?.id || !roomId) return;

    const channelName = `coin_toss_${roomId}`;
    console.log(`🔌 [Coin Toss Room] Kết nối channel: ${channelName}`);

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // A. Lắng nghe Presence (Danh sách người trong phòng)
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<RoomMember>();
        const memberList: RoomMember[] = [];

        Object.keys(state).forEach((key) => {
          const presences = state[key];
          if (presences && presences.length > 0) {
            const p = presences[presences.length - 1];
            memberList.push(p);
          }
        });

        // Sắp xếp Host lên đầu tiên
        memberList.sort((a, b) => (b.is_host ? 1 : 0) - (a.is_host ? 1 : 0));
        setMembers(memberList);
      })
      // B. Nhận sự kiện Host tung đồng xu (Guest cũng thấy animation đồng thời)
      .on('broadcast', { event: 'toss_started' }, ({ payload }) => {
        console.log('🪙 [Broadcast] Đồng xu đang tung:', payload);
        setIsTossing(true);
        setTossStatusText(`${payload?.host_name || 'Host'} đang tung đồng xu may mắn (${payload?.amount} SOL)...`);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Kích hoạt animation tung đồng xu cho Guest
        coinTranslateY.value = withSequence(
          withTiming(-450, { duration: 800, easing: Easing.out(Easing.quad) }),
          withSpring(0, { damping: 12, stiffness: 100 })
        );
        coinScale.value = withSequence(
          withTiming(1.35, { duration: 400 }),
          withTiming(1, { duration: 500 })
        );
        coinRotateY.value = withTiming(coinRotateY.value + 1800, {
          duration: 1800,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      })
      // C. Nhận kết quả người trúng thưởng
      .on('broadcast', { event: 'winner_selected' }, ({ payload }) => {
        console.log('🎉 [Broadcast] Đã tìm ra người trúng thưởng:', payload);
        setIsTossing(false);
        setTossStatusText('Đã tìm ra người may mắn!');

        const winnerMember: RoomMember = {
          user_id: payload.winner_id,
          name: payload.winner_name,
          avatar: payload.winner_name?.charAt(0).toUpperCase() || 'W',
          wallet_address: payload.winner_wallet,
        };

        setWinner(winnerMember);
        setWonAmount(payload.amount);
        setLastTxSignature(payload.txSignature);
        setShowWinnerModal(true);

        triggerHapticSuccess();

        // Animation popup vinh danh
        winnerModalScale.value = 0.3;
        winnerModalScale.value = withSpring(1, { damping: 10, stiffness: 120 });

        // Cập nhật lại số dư ví nếu là người nhận hoặc host
        if (myAddress) {
          getSolanaBalance(myAddress).then(setSolBalance).catch(console.log);
        }
      })
      .subscribe(async (status) => {
        console.log(`📡 [Realtime Room] Status: ${status}`);
        if (status === 'SUBSCRIBED') {
          const payload: RoomMember = {
            user_id: user.id,
            name: myProfile.name,
            avatar: myProfile.avatar,
            wallet_address: myAddress || undefined,
            is_host: isHost,
            joined_at: Date.now(),
          };
          await channel.track(payload);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log(`🧹 [Coin Toss Room] Rời phòng ${channelName}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, roomId, myAddress, myProfile, isHost]);

  // 2. THUẬT TOÁN RANDOM & THỰC THI GIAO DỊCH ON-CHAIN (CHỈ HOST THỰC HIỆN)
  const handleHostExecuteCoinToss = async () => {
    if (!isHost) return;

    if (!myAddress) {
      Alert.alert('Thông báo', 'Không tìm thấy địa chỉ ví của Host.');
      coinTranslateY.value = withSpring(0);
      coinScale.value = withSpring(1);
      coinOpacity.value = withTiming(1);
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Số tiền không hợp lệ', 'Vui lòng nhập số lượng SOL lì xì lớn hơn 0.');
      coinTranslateY.value = withSpring(0);
      coinScale.value = withSpring(1);
      coinOpacity.value = withTiming(1);
      return;
    }

    if (solBalance !== null && numAmount > solBalance) {
      Alert.alert('Số dư không đủ', `Ví của bạn (${solBalance.toFixed(4)} SOL) không đủ để lì xì ${numAmount} SOL.`);
      coinTranslateY.value = withSpring(0);
      coinScale.value = withSpring(1);
      coinOpacity.value = withTiming(1);
      return;
    }

    // Lọc danh sách Guest trong phòng (loại bỏ Host)
    const guests = members.filter((m) => !m.is_host && m.wallet_address && m.user_id !== user?.id);

    if (guests.length === 0) {
      Alert.alert(
        'Chưa có người chơi!',
        'Phòng cần ít nhất 1 thành viên (Guest) tham gia để có thể tung đồng xu lì xì. Hãy bấm nút "Mời bạn bè" để mời người quanh đây!'
      );
      coinTranslateY.value = withSpring(0);
      coinScale.value = withSpring(1);
      coinOpacity.value = withTiming(1);
      return;
    }

    if (!isWalletReady) {
      Alert.alert(
        'Ví đang kết nối',
        `Ví nhúng đang ở trạng thái (${walletStatus}). Vui lòng chờ vài giây để kết nối hoàn tất!`
      );
      coinTranslateY.value = withSpring(0);
      coinScale.value = withSpring(1);
      coinOpacity.value = withTiming(1);
      return;
    }

    try {
      setIsTossing(true);
      setTossStatusText('Đang tung đồng xu và chọn người may mắn...');

      // Bắn sự kiện bắt đầu tung cho toàn phòng
      channelRef.current?.send({
        type: 'broadcast',
        event: 'toss_started',
        payload: {
          host_name: myProfile.name,
          amount: numAmount,
        },
      });

      // Thuật toán Random chọn 1 Guest may mắn duy nhất
      const randomIndex = Math.floor(Math.random() * guests.length);
      const chosenGuest = guests[randomIndex];
      console.log(`🎯 [Random Choice] Người may mắn được chọn: ${chosenGuest.name} (${chosenGuest.wallet_address})`);

      // Ký và thực thi chuyển SOL trực tiếp on-chain trên Solana Devnet
      const transferResult = await transfer({
        fromAddress: myAddress,
        recipientAddressOrPhone: chosenGuest.wallet_address!,
        amountSol: numAmount,
      });

      if (!transferResult.success || !transferResult.transactionHash) {
        const errorMsg = transferResult.error || 'Giao dịch on-chain không thành công.';
        setIsTossing(false);
        setTossStatusText('Giao dịch chưa hoàn tất. Vuốt để thử lại.');
        Alert.alert('Lỗi Chuyển Lì Xì ❌', errorMsg);
        return;
      }

      const txSignature = transferResult.transactionHash;

      // Broadcast kết quả cho tất cả mọi người trong phòng
      channelRef.current?.send({
        type: 'broadcast',
        event: 'winner_selected',
        payload: {
          winner_id: chosenGuest.user_id,
          winner_name: chosenGuest.name,
          winner_wallet: chosenGuest.wallet_address,
          amount: numAmount,
          txSignature,
        },
      });

      // Cập nhật trạng thái Host
      setWinner(chosenGuest);
      setWonAmount(numAmount);
      setLastTxSignature(txSignature);
      setShowWinnerModal(true);
      setIsTossing(false);
      setTossStatusText('Đã trao lì xì thành công!');

      winnerModalScale.value = 0.3;
      winnerModalScale.value = withSpring(1, { damping: 10, stiffness: 120 });

      // Cập nhật số dư Host
      getSolanaBalance(myAddress).then(setSolBalance).catch(console.log);
    } catch (err: any) {
      console.error('Coin Toss Error:', err);
      setIsTossing(false);
      setTossStatusText('Đã xảy ra lỗi. Vuốt để thử lại.');
      Alert.alert('Lỗi Tung Đồng Xu', err?.message || 'Không thể thực hiện lúc này.');
    }
  };

  // 3. TƯƠNG TÁC GESTURE DETECTOR (TOUCH DOWN -> DRAG -> RELEASE FLIGHT)
  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(isHost && !isTossing)
      // A. TRẠNG THÁI NÉN (Touch Down / onBegin)
      .onBegin(() => {
        'worklet';
        coinScale.value = withSpring(0.9, { damping: 15, stiffness: 220 });
        coinOpacity.value = withTiming(0.7, { duration: 120 });
        runOnJS(triggerHapticLight)();
      })
      // B. TRẠNG THÁI VUỐT (Drag / onUpdate)
      .onUpdate((event) => {
        'worklet';
        // Chỉ cho phép vuốt lên trên (translationY < 0), kéo xuống bị cản lực
        if (event.translationY < 0) {
          coinTranslateY.value = event.translationY;
        } else {
          coinTranslateY.value = event.translationY * 0.15;
        }
      })
      // C. TRẠNG THÁI TUNG (Release / onEnd)
      .onEnd((event) => {
        'worklet';
        // Kiểm tra lực/khoảng cách vuốt: nếu translationY < -120px HOẶC velocityY < -550
        if (event.translationY < -120 || event.velocityY < -550) {
          coinOpacity.value = withTiming(1, { duration: 80 });

          // Bay vút lên không trung ra khỏi khung nhìn và rơi lại
          coinTranslateY.value = withTiming(
            -500,
            {
              duration: 750,
              easing: Easing.out(Easing.quad),
            },
            (finished) => {
              if (finished) {
                coinTranslateY.value = withSpring(0, { damping: 12, stiffness: 100 });
                coinScale.value = withSpring(1, { damping: 14, stiffness: 150 });
              }
            }
          );

          coinScale.value = withSequence(
            withTiming(1.35, { duration: 350 }),
            withTiming(1, { duration: 400 })
          );

          coinRotateY.value = withTiming(coinRotateY.value + 1800, {
            duration: 1800,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          });

          runOnJS(triggerHapticHeavy)();
          runOnJS(handleHostExecuteCoinToss)();
        } else {
          // Chưa đủ lực -> Đàn hồi nảy về vị trí gốc
          coinTranslateY.value = withSpring(0, { damping: 14, stiffness: 180 });
          coinScale.value = withSpring(1, { damping: 14, stiffness: 180 });
          coinOpacity.value = withTiming(1, { duration: 150 });
        }
      })
      .onFinalize(() => {
        'worklet';
        if (coinTranslateY.value !== -500) {
          coinOpacity.value = withTiming(1, { duration: 150 });
        }
      });
  }, [isHost, isTossing, myAddress, amount, solBalance, isWalletReady, members]);

  // Reanimated Animated Styles
  const animatedCoinStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: coinTranslateY.value },
        { scale: coinScale.value },
        { rotateY: `${coinRotateY.value}deg` },
      ],
      opacity: coinOpacity.value,
    };
  });

  const animatedGlowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: coinGlowScale.value }],
      opacity: coinGlowOpacity.value,
    };
  });

  const animatedWinnerModalStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: winnerModalScale.value }],
    };
  });

  // Mời bạn bè lân cận qua Supabase Presence
  const handleInviteUser = async (targetUser: any) => {
    try {
      Haptics.selectionAsync();
      await broadcastInvite(roomId, [targetUser.user_id], {
        roomType: 'coin_toss',
        note: 'Vào phòng tung đồng xu nhận lì xì SOL may mắn!',
      });
      setInvitedUserIds((prev) => [...prev, targetUser.user_id]);
      Alert.alert('Đã gửi lời mời! 📩', `Đã gửi lời mời tham gia phòng tới ${targetUser.name}`);
    } catch (e) {
      console.log('Error inviting:', e);
    }
  };

  const copyRoomId = async () => {
    await Clipboard.setStringAsync(roomId);
    Alert.alert('Thông báo', 'Đã sao chép mã phòng!');
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFBEB" />

        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#78350F" />
          </TouchableOpacity>

          <View style={styles.headerTitleCol}>
            <View style={styles.roomBadgeRow}>
              <View style={[styles.roleBadge, isHost ? styles.roleBadgeHost : styles.roleBadgeGuest]}>
                <Text style={[styles.roleBadgeText, isHost ? styles.roleBadgeTextHost : styles.roleBadgeTextGuest]}>
                  {isHost ? '👑 HOST' : '🎮 GUEST'}
                </Text>
              </View>
              <TouchableOpacity style={styles.roomPill} onPress={copyRoomId}>
                <Text style={styles.roomPillText}>Phòng: {roomId.slice(0, 10)}...</Text>
                <Feather name="copy" size={12} color="#92400E" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          </View>

          {isHost ? (
            <TouchableOpacity
              style={styles.inviteHeaderBtn}
              onPress={() => setShowInviteModal(true)}
            >
              <Ionicons name="person-add" size={18} color="#D97706" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* NỬA TRÊN: DANH SÁCH THÀNH VIÊN TRONG PHÒNG */}
          <View style={styles.membersSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.onlineDot} />
                <Text style={styles.sectionTitle}>
                  Người Trong Phòng ({members.length})
                </Text>
              </View>

              {isHost && (
                <TouchableOpacity
                  style={styles.inviteTextBtn}
                  onPress={() => setShowInviteModal(true)}
                >
                  <Feather name="user-plus" size={14} color="#D97706" style={{ marginRight: 4 }} />
                  <Text style={styles.inviteTextBtnText}>Mời bạn bè ({nearbyUsers.length})</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Avatar Row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.avatarScrollContent}
            >
              {members.map((m) => {
                const isMe = m.user_id === user?.id;
                return (
                  <View key={m.user_id} style={styles.memberAvatarCol}>
                    <View
                      style={[
                        styles.avatarCircle,
                        m.is_host && styles.avatarCircleHost,
                        isMe && styles.avatarCircleMe,
                      ]}
                    >
                      <Text style={styles.avatarText}>{m.avatar}</Text>
                      {m.is_host && (
                        <View style={styles.crownBadge}>
                          <Text style={{ fontSize: 10 }}>👑</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {isMe ? 'Bạn' : m.name}
                    </Text>
                    <Text style={styles.memberRole}>
                      {m.is_host ? 'Host' : 'Guest'}
                    </Text>
                  </View>
                );
              })}

              {members.length === 1 && isHost && (
                <TouchableOpacity
                  style={styles.addMemberPlaceholder}
                  onPress={() => setShowInviteModal(true)}
                >
                  <Feather name="plus" size={20} color="#D97706" />
                  <Text style={styles.addMemberPlaceholderText}>Mời thêm</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* NỬA DƯỚI: FORM NHẬP TIỀN & ĐỒNG XU TUNG */}
          <View style={styles.tossStageCard}>
            {isHost ? (
              <View style={styles.hostFormContainer}>
                <View style={styles.amountHeaderRow}>
                  <Text style={styles.amountLabel}>Số lượng SOL Lì Xì:</Text>
                  {solBalance !== null && (
                    <Text style={styles.balanceText}>Ví: {solBalance.toFixed(4)} SOL</Text>
                  )}
                </View>

                <View style={styles.amountInputBox}>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.005"
                    placeholderTextColor="#94A3B8"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    editable={!isTossing}
                  />
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyBadgeText}>SOL</Text>
                  </View>
                </View>

                {/* Quick Pills */}
                <View style={styles.quickPillRow}>
                  {['0.005', '0.01', '0.02', '0.05'].map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={[styles.quickPill, amount === amt && styles.quickPillActive]}
                      onPress={() => setAmount(amt)}
                      disabled={isTossing}
                    >
                      <Text
                        style={[
                          styles.quickPillText,
                          amount === amt && styles.quickPillTextActive,
                        ]}
                      >
                        {amt} SOL
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.guestWaitingBox}>
                <Text style={styles.guestWaitingTitle}>
                  🎁 Chờ Host Tung Đồng Xu
                </Text>
                <Text style={styles.guestWaitingDesc}>
                  Khi Host vuốt tung đồng xu, hệ thống sẽ chọn ngẫu nhiên 1 người trong phòng để nhận lì xì SOL trực tiếp on-chain!
                </Text>
              </View>
            )}

            {/* VÙNG TUNG ĐỒNG XU (COIN TOSS ARENA) */}
            <View style={styles.coinArena}>
              {/* Vòng Glow hào quang nhịp thở */}
              <Animated.View style={[styles.coinGlowRing, animatedGlowStyle]} />

              {/* Component Đồng Xu Tương Tác GestureDetector & Reanimated */}
              <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.coin3DWrapper, animatedCoinStyle]}>
                  <View style={styles.coinBodyOuter}>
                    <View style={styles.coinBodyInner}>
                      <Text style={styles.coinSymbol}>🪙</Text>
                      <Text style={styles.coinText}>SOL</Text>
                    </View>
                  </View>
                </Animated.View>
              </GestureDetector>

              {/* Mũi tên chỉ dẫn vuốt */}
              {isHost && !isTossing && (
                <View style={styles.swipeHintContainer}>
                  <Feather name="chevrons-up" size={24} color="#D97706" />
                  <Text style={styles.swipeHintText}>Vuốt lên để tung đồng xu</Text>
                </View>
              )}
            </View>

            {/* Trạng Thái & Nút Bấm Thủ Công */}
            <View style={styles.statusActionRow}>
              <Text style={styles.tossStatusText}>{tossStatusText}</Text>

              {isHost && (
                <TouchableOpacity
                  style={[
                    styles.manualTossBtn,
                    (isTossing || !isWalletReady) && styles.manualTossBtnDisabled,
                  ]}
                  onPress={handleHostExecuteCoinToss}
                  disabled={isTossing || !isWalletReady}
                  activeOpacity={0.85}
                >
                  {isTossing ? (
                    <View style={styles.btnInner}>
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.manualTossBtnText}>
                        {statusMessage || 'Đang trao thưởng On-chain...'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.btnInner}>
                      <MaterialCommunityIcons name="hand-coin" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.manualTossBtnText}>
                        Tung Ngay ({amount} SOL)
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* MODAL CHIẾN THẮNG (WINNER CELEBRATION MODAL) */}
        <Modal
          visible={showWinnerModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowWinnerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.winnerCard, animatedWinnerModalStyle]}>
              <View style={styles.winnerConfettiIcon}>
                <Text style={{ fontSize: 50 }}>🎉</Text>
              </View>

              <Text style={styles.winnerCardHeading}>
                {winner?.user_id === user?.id
                  ? 'CHÚC MỪNG BẠN ĐÃ TRÚNG THƯỞNG! 🧧'
                  : 'NGƯỜI MAY MẮN NHẤT PHÒNG! 🏆'}
              </Text>

              <View style={styles.winnerAvatarLarge}>
                <Text style={styles.winnerAvatarLargeText}>
                  {winner?.avatar || 'W'}
                </Text>
              </View>

              <Text style={styles.winnerNameText}>{winner?.name}</Text>
              <Text style={styles.winnerWalletText}>
                {winner?.wallet_address
                  ? `${winner.wallet_address.slice(0, 6)}...${winner.wallet_address.slice(-6)}`
                  : ''}
              </Text>

              <View style={styles.rewardPill}>
                <Text style={styles.rewardPillText}>
                  +{wonAmount} SOL
                </Text>
              </View>

              {lastTxSignature && (
                <View style={styles.txBox}>
                  <Text style={styles.txBoxLabel}>Chữ ký On-chain Solana:</Text>
                  <Text style={styles.txBoxValue} numberOfLines={1}>
                    {lastTxSignature}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.closeWinnerBtn}
                onPress={() => setShowWinnerModal(false)}
              >
                <Text style={styles.closeWinnerBtnText}>Tuyệt Vời! Tiếp Tục Chơi</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        {/* MODAL MỜI BẠN BÈ XUNG QUANH (PRESENCE DISCOVERY) */}
        <Modal
          visible={showInviteModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowInviteModal(false)}
        >
          <View style={styles.modalOverlayBottom}>
            <View style={styles.inviteSheet}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>Mời Bạn Bè Vào Phòng</Text>
                  <Text style={styles.sheetSubtitle}>
                    Phát hiện qua Supabase Realtime Presence
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeSheetBtn}
                  onPress={() => setShowInviteModal(false)}
                >
                  <Ionicons name="close" size={22} color="#1E293B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 350 }}>
                {nearbyUsers.map((u) => {
                  const isAlreadyIn = members.some((m) => m.user_id === u.user_id);
                  const isInvited = invitedUserIds.includes(u.user_id);

                  return (
                    <View key={u.user_id} style={styles.nearbyUserRow}>
                      <View style={styles.nearbyAvatar}>
                        <Text style={styles.nearbyAvatarText}>{u.avatar}</Text>
                      </View>
                      <View style={styles.nearbyInfo}>
                        <Text style={styles.nearbyName}>{u.name}</Text>
                        <Text style={styles.nearbyDist}>
                          {u.distanceMeters !== undefined
                            ? `Cách bạn ~${u.distanceMeters}m`
                            : 'Đang online'}
                        </Text>
                      </View>

                      {isAlreadyIn ? (
                        <View style={styles.alreadyInBadge}>
                          <Text style={styles.alreadyInText}>Đã vào phòng</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.inviteBtn,
                            isInvited && styles.inviteBtnSent,
                          ]}
                          onPress={() => handleInviteUser(u)}
                          disabled={isInvited}
                        >
                          <Text
                            style={[
                              styles.inviteBtnText,
                              isInvited && styles.inviteBtnTextSent,
                            ]}
                          >
                            {isInvited ? 'Đã gửi' : 'Mời vào'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}

                {nearbyUsers.length === 0 && (
                  <View style={styles.emptyNearbyBox}>
                    <Feather name="users" size={36} color="#CBD5E1" />
                    <Text style={styles.emptyNearbyText}>
                      Chưa phát hiện thiết bị nào khác đang mở app quanh đây.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal Khôi phục Ví */}
        <WalletRecoveryModal
          visible={showRecoveryModal || needsRecovery}
          onClose={() => setShowRecoveryModal(false)}
          onSuccess={() => setShowRecoveryModal(false)}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBEB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleCol: {
    alignItems: 'center',
  },
  roomBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
  },
  roleBadgeHost: {
    backgroundColor: '#FEF3C7',
  },
  roleBadgeGuest: {
    backgroundColor: '#E0F2FE',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  roleBadgeTextHost: {
    color: '#D97706',
  },
  roleBadgeTextGuest: {
    color: '#0284C7',
  },
  roomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roomPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  inviteHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  membersSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  inviteTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inviteTextBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  avatarScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  memberAvatarCol: {
    alignItems: 'center',
    marginRight: 16,
    width: 60,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FDE68A',
    marginBottom: 4,
  },
  avatarCircleHost: {
    borderColor: '#D97706',
    backgroundColor: '#FEF3C7',
  },
  avatarCircleMe: {
    borderWidth: 2.5,
    borderColor: '#D97706',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#92400E',
  },
  crownBadge: {
    position: 'absolute',
    top: -8,
    right: -4,
  },
  memberName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  memberRole: {
    fontSize: 10,
    color: '#64748B',
  },
  addMemberPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#D97706',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  addMemberPlaceholderText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D97706',
    marginTop: 1,
  },
  tossStageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  hostFormContainer: {
    marginBottom: 16,
  },
  amountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  balanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  amountInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 50,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  currencyBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  currencyBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  quickPillRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  quickPill: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickPillActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  quickPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  quickPillTextActive: {
    color: '#92400E',
    fontWeight: '800',
  },
  guestWaitingBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
  },
  guestWaitingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 4,
  },
  guestWaitingDesc: {
    fontSize: 12,
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 17,
  },
  coinArena: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  coinGlowRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  coin3DWrapper: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinBodyOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: '#D97706',
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  coinBodyInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  coinSymbol: {
    fontSize: 34,
  },
  coinText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#78350F',
    marginTop: -2,
    letterSpacing: 1,
  },
  swipeHintContainer: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginTop: 2,
  },
  statusActionRow: {
    alignItems: 'center',
    marginTop: 10,
  },
  tossStatusText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
    textAlign: 'center',
  },
  manualTossBtn: {
    backgroundColor: '#D97706',
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  manualTossBtnDisabled: {
    backgroundColor: '#FCD34D',
    shadowOpacity: 0,
    elevation: 0,
  },
  manualTossBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  winnerCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  winnerConfettiIcon: {
    marginBottom: 8,
  },
  winnerCardHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: '#D97706',
    textAlign: 'center',
    marginBottom: 16,
  },
  winnerAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#F59E0B',
    marginBottom: 8,
  },
  winnerAvatarLargeText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#92400E',
  },
  winnerNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  winnerWalletText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 16,
  },
  rewardPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    marginBottom: 16,
  },
  rewardPillText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#15803D',
  },
  txBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    width: '100%',
    marginBottom: 18,
  },
  txBoxLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  txBoxValue: {
    fontSize: 11,
    color: '#0284C7',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  closeWinnerBtn: {
    backgroundColor: '#D97706',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeWinnerBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  inviteSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeSheetBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  nearbyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nearbyAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400E',
  },
  nearbyInfo: {
    flex: 1,
  },
  nearbyName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  nearbyDist: {
    fontSize: 12,
    color: '#64748B',
  },
  alreadyInBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  alreadyInText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  inviteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#D97706',
    borderRadius: 10,
  },
  inviteBtnSent: {
    backgroundColor: '#FDE68A',
  },
  inviteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inviteBtnTextSent: {
    color: '#92400E',
  },
  emptyNearbyBox: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyNearbyText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 10,
  },
});
