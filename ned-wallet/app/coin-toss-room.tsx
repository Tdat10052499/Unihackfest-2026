import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Image,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
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
import { getUsdcTokenBalance } from '../services/solana';
import { resolveActiveSolanaAddress } from '../services/identity';
import { useOnchainTransfer } from '../hooks/useOnchainTransfer';
import { useGlobalPresence } from '../contexts/GlobalPresenceContext';
import { WalletRecoveryModal } from '../components/WalletRecoveryModal';
import { useExternalWallet } from '../src/providers/WalletProvider';
import { useUserStore } from '../stores/useUserStore';

interface RoomMember {
  user_id: string;
  name: string;
  avatar: string;
  avatar_url?: string | null;
  wallet_address?: string;
  is_host?: boolean;
  joined_at?: number;
}

const PRESET_AMOUNTS = [
  { value: '1.00', label: '$1', bg: '#8A2BE2', textColor: '#FFFFFF' },
  { value: '5.00', label: '$5', bg: '#00E5FF', textColor: '#000000' },
  { value: '10.00', label: '$10', bg: '#FF4C4C', textColor: '#FFFFFF' },
  { value: '20.00', label: '$20', bg: '#FFFFFF', textColor: '#000000' },
];

export default function CoinTossRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const roomId = (params.roomId as string) || 'Coin_mthbc98';
  const isHost = String(params.isHost) === 'true';
  const hostId = (params.hostId as string) || '';
  const hostName = (params.hostName as string) || 'Host';
  const hostWallet = (params.hostWallet as string) || '';
  const hostAvatar = (params.hostAvatar as string) || 'H';

  const { user } = usePrivy();
  const externalWallet = useExternalWallet();
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

  // Kênh Realtime đồng bộ phòng
  const roomChannelRef = useRef<any>(null);

  // Danh sách thành viên trong phòng Realtime
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [amount, setAmount] = useState('5.00');
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);

  // Trạng thái Tung Đồng Xu
  const [isTossing, setIsTossing] = useState(false);
  const [tossStatusText, setTossStatusText] = useState('Vuốt lên để tung đồng xu');
  const [winner, setWinner] = useState<RoomMember | null>(null);
  const [wonAmount, setWonAmount] = useState<number | null>(null);
  const [lastTxSignature, setLastTxSignature] = useState<string | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  // Reanimated Shared Values cho Đồng Xu
  const coinTranslateY = useSharedValue(0);
  const coinScale = useSharedValue(1);
  const coinOpacity = useSharedValue(1);
  const coinRotateY = useSharedValue(0);
  const winnerModalScale = useSharedValue(0.3);

  // Reanimated Shared Values cho Nút Hành Động
  const buttonTranslateY = useSharedValue(0);

  // Lấy địa chỉ ví người dùng
  const getMySolanaAddress = (): string | null => {
    return resolveActiveSolanaAddress(
      user,
      externalWallet,
      solanaWalletState,
      useUserStore.getState().walletAddress
    );
  };

  const myAddress = getMySolanaAddress();

  // Lấy tên hiển thị và avatar của người dùng theo đúng thông tin ví
  const getMyProfile = () => {
    const userState = useUserStore.getState();
    const walletUsername = userState.username;
    const walletAvatarUrl = userState.avatarUrl;

    if (!user) {
      return {
        name: walletUsername || 'Người chơi',
        avatar: (walletUsername || 'N').charAt(0).toUpperCase(),
        avatar_url: walletAvatarUrl || null,
      };
    }
    const googleAcc =
      (user as any)?.google ||
      (user as any)?.linked_accounts?.find(
        (a: any) => a.type === 'google_oauth' || a.type === 'google'
      );
    const emailAcc = (user as any)?.email;

    const name =
      walletUsername ||
      googleAcc?.name ||
      (googleAcc?.email ? googleAcc.email.split('@')[0] : null) ||
      (emailAcc?.address ? emailAcc.address.split('@')[0] : 'Người chơi');

    const avatar = name.charAt(0).toUpperCase();
    return { name, avatar, avatar_url: walletAvatarUrl || null };
  };

  const myProfile = useMemo(() => getMyProfile(), [user]);

  // Nạp số dư USDC Token
  useEffect(() => {
    if (myAddress) {
      getUsdcTokenBalance(myAddress).then(setUsdcBalance).catch(console.log);
    }
  }, [myAddress]);

  // Haptic feedback helpers
  const triggerHapticLight = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const triggerHapticHeavy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  // 1. KHỞI TẠO THÀNH VIÊN BAN ĐẦU
  useEffect(() => {
    if (!user?.id || !roomId) return;

    const currentMember: RoomMember = {
      user_id: user.id,
      name: myProfile.name,
      avatar: isHost ? 'H' : myProfile.avatar,
      avatar_url: myProfile.avatar_url,
      wallet_address: myAddress || undefined,
      is_host: isHost,
      joined_at: Date.now(),
    };

    if (isHost) {
      setMembers([currentMember]);
    } else {
      const initial: RoomMember[] = [];
      if (hostId && hostId !== user.id) {
        initial.push({
          user_id: hostId,
          name: decodeURIComponent(hostName),
          avatar: decodeURIComponent(hostAvatar) || 'H',
          wallet_address: decodeURIComponent(hostWallet) || undefined,
          is_host: true,
          joined_at: Date.now() - 1000,
        });
      }
      initial.push(currentMember);
      setMembers(initial);
    }
  }, [user?.id, roomId, myAddress, myProfile, isHost, hostId, hostName, hostWallet, hostAvatar]);

  // 2. KẾT NỐI KÊNH SUPABASE REALTIME (room_${roomId}) ĐỂ MỜI & ĐỒNG BỘ THÀNH VIÊN
  useEffect(() => {
    if (!roomId || !user?.id) return;

    console.log(`📡 [CoinTossRoom] Đăng ký kênh phòng: room_${roomId}`);
    const channel = supabase.channel(`room_${roomId}`, {
      config: { broadcast: { ack: true } },
    });

    channel
      .on('broadcast', { event: 'room_join' }, ({ payload }) => {
        console.log('👋 [CoinTossRoom] Thành viên tham gia:', payload);
        if (payload?.user_id && payload.user_id !== user.id) {
          const newMember: RoomMember = {
            user_id: payload.user_id,
            name: payload.name || 'Người chơi',
            avatar: payload.avatar || 'U',
            avatar_url: payload.avatar_url || null,
            wallet_address: payload.wallet_address,
            is_host: Boolean(payload.is_host),
            joined_at: Date.now(),
          };

          setMembers((prev) => {
            const exists = prev.some((m) => m.user_id === payload.user_id);
            if (exists) {
              return prev.map((m) =>
                m.user_id === payload.user_id ? { ...m, ...newMember } : m
              );
            }
            return [...prev, newMember];
          });

          setInvitedUserIds((prev) =>
            prev.includes(payload.user_id) ? prev : [...prev, payload.user_id]
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Nếu là Host, phản hồi gửi toàn bộ danh sách thành viên hiện có cho Guest
          if (isHost) {
            setMembers((currentMembers) => {
              const fullList = currentMembers.some((m) => m.user_id === payload.user_id)
                ? currentMembers
                : [...currentMembers, newMember];

              channel.send({
                type: 'broadcast',
                event: 'room_sync_members',
                payload: {
                  members: fullList,
                  amount: amount,
                },
              });
              return fullList;
            });
          }
        }
      })
      .on('broadcast', { event: 'room_sync_members' }, ({ payload }) => {
        console.log('🔄 [CoinTossRoom] Đồng bộ danh sách thành viên:', payload);
        if (!isHost && Array.isArray(payload?.members) && payload.members.length > 0) {
          setMembers(payload.members);
          if (payload.amount) {
            setAmount(payload.amount);
          }
        }
      })
      .on('broadcast', { event: 'room_reject' }, ({ payload }) => {
        console.log('❌ [CoinTossRoom] Khách từ chối tham gia:', payload);
        if (payload?.user_id && isHost) {
          setInvitedUserIds((prev) => prev.filter((id) => id !== payload.user_id));
          Alert.alert(
            'Từ chối tham gia',
            `${payload.name || 'Người dùng'} đã từ chối tham gia phòng lì xì.`
          );
        }
      })
      .on('broadcast', { event: 'room_kick' }, ({ payload }) => {
        console.log('🚪 [CoinTossRoom] Thành viên bị xóa:', payload);
        if (payload?.target_user_id === user.id) {
          Alert.alert('Rời khỏi phòng', 'Bạn đã được mời rời khỏi phòng lì xì.', [
            {
              text: 'Đồng ý',
              onPress: () => {
                if (router.canGoBack()) router.back();
                else router.replace('/(tabs)/transfer-hub');
              },
            },
          ]);
        } else if (payload?.target_user_id) {
          setMembers((prev) => prev.filter((m) => m.user_id !== payload.target_user_id));
        }
      })
      .on('broadcast', { event: 'room_amount_update' }, ({ payload }) => {
        if (!isHost && payload?.amount) {
          setAmount(payload.amount);
        }
      })
      .on('broadcast', { event: 'coin_toss_start' }, ({ payload }) => {
        console.log('🎲 [CoinTossRoom] Host tung đồng xu:', payload);
        if (!isHost) {
          setIsTossing(true);
          setTossStatusText('Chủ phòng đang tung đồng xu lì xì...');
          coinOpacity.value = withTiming(1, { duration: 80 });
          coinTranslateY.value = withTiming(
            -450,
            {
              duration: 700,
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
            withTiming(1.35, { duration: 320 }),
            withTiming(1, { duration: 380 })
          );
          coinRotateY.value = withTiming(coinRotateY.value + 1800, {
            duration: 1600,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          });
        }
      })
      .on('broadcast', { event: 'coin_toss_result' }, ({ payload }) => {
        console.log('🎉 [CoinTossRoom] Kết quả tung đồng xu:', payload);
        if (payload?.winner) {
          setWinner(payload.winner);
          setWonAmount(payload.amount);
          setLastTxSignature(payload.txSignature || null);
          setIsTossing(false);
          setShowWinnerModal(true);
          winnerModalScale.value = 0.3;
          winnerModalScale.value = withSpring(1, { damping: 10, stiffness: 120 });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTossStatusText('Đã trao lì xì thành công!');
        }
      })
      .subscribe((status) => {
        console.log(`📡 [CoinTossRoom] Trạng thái phòng:`, status);
        if (status === 'SUBSCRIBED') {
          if (!isHost) {
            // Guest thông báo cho Host biết mình đã vào phòng
            const userState = useUserStore.getState();
            channel.send({
              type: 'broadcast',
              event: 'room_join',
              payload: {
                room_id: roomId,
                user_id: user.id,
                name: userState.username || myProfile.name,
                avatar: myProfile.avatar,
                avatar_url: userState.avatarUrl || null,
                wallet_address: myAddress,
                is_host: false,
              },
            });
          }
        }
      });

    roomChannelRef.current = channel;

    return () => {
      console.log(`🧹 [CoinTossRoom] Hủy kênh room_${roomId}`);
      supabase.removeChannel(channel);
      roomChannelRef.current = null;
    };
  }, [roomId, user?.id, isHost, myAddress]);

  // 2. THỰC THI GIAO DỊCH ON-CHAIN VỚI STABLECOIN (USDC)
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
      Alert.alert('Số tiền không hợp lệ', 'Vui lòng nhập số lượng Lì Xì (USD) lớn hơn 0.');
      coinTranslateY.value = withSpring(0);
      coinScale.value = withSpring(1);
      coinOpacity.value = withTiming(1);
      return;
    }

    if (usdcBalance !== null && numAmount > usdcBalance) {
      Alert.alert(
        'Số dư không đủ',
        `Ví của bạn ($${usdcBalance.toFixed(2)} USDC) không đủ để lì xì $${numAmount.toFixed(2)} USDC.`
      );
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
        'Phòng cần ít nhất 1 thành viên (Guest) tham gia để có thể tung đồng xu lì xì. Hãy bấm nút "+ Invite" để mời bạn bè quanh đây!'
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

      // Thuật toán Random chọn 1 Guest may mắn duy nhất
      const randomIndex = Math.floor(Math.random() * guests.length);
      const chosenGuest = guests[randomIndex];
      console.log(`🎯 [Random Choice] Người may mắn được chọn: ${chosenGuest.name} (${chosenGuest.wallet_address})`);

      // Ký và thực thi chuyển USDC Stablecoin trực tiếp on-chain trên Solana
      const transferResult = await transfer({
        fromAddress: myAddress,
        recipientAddressOrPhone: chosenGuest.wallet_address!,
        amountUsd: numAmount,
      });

      if (!transferResult.success || !transferResult.transactionHash) {
        const errorMsg = transferResult.error || 'Giao dịch on-chain không thành công.';
        setIsTossing(false);
        setTossStatusText('Giao dịch chưa hoàn tất. Vuốt để thử lại.');
        Alert.alert('Lỗi Chuyển Lì Xì ❌', errorMsg);
        return;
      }

      const txSignature = transferResult.transactionHash;

      // Cập nhật trạng thái Host
      setWinner(chosenGuest);
      setWonAmount(numAmount);
      setLastTxSignature(txSignature);
      setShowWinnerModal(true);
      setIsTossing(false);
      setTossStatusText('Đã trao lì xì thành công!');

      // Phát sóng kết quả cho toàn bộ phòng Realtime
      roomChannelRef.current?.send({
        type: 'broadcast',
        event: 'coin_toss_result',
        payload: {
          winner: chosenGuest,
          amount: numAmount,
          txSignature,
        },
      });

      winnerModalScale.value = 0.3;
      winnerModalScale.value = withSpring(1, { damping: 10, stiffness: 120 });

      // Cập nhật số dư Host
      getUsdcTokenBalance(myAddress).then(setUsdcBalance).catch(console.log);
    } catch (err: any) {
      console.error('Coin Toss Error:', err);
      setIsTossing(false);
      setTossStatusText('Đã xảy ra lỗi. Vuốt để thử lại.');
      Alert.alert('Lỗi Tung Đồng Xu', err?.message || 'Không thể thực hiện lúc này.');
    }
  };

  // KÍCH HOẠT HIỆU ỨNG TUNG ĐỒNG XU BAY LÊN & THỰC THI
  const launchCoinToss = () => {
    if (isTossing || !isHost) return;

    // Phát sóng bắt đầu tung đồng xu cho các máy Guest cùng thấy hiệu ứng
    roomChannelRef.current?.send({
      type: 'broadcast',
      event: 'coin_toss_start',
      payload: { amount: parseFloat(amount) },
    });

    coinOpacity.value = withTiming(1, { duration: 80 });
    coinTranslateY.value = withTiming(
      -450,
      {
        duration: 700,
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
      withTiming(1.35, { duration: 320 }),
      withTiming(1, { duration: 380 })
    );

    coinRotateY.value = withTiming(coinRotateY.value + 1800, {
      duration: 1600,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    handleHostExecuteCoinToss();
  };

  // 3. GESTURE DETECTOR CHO ĐỒNG XU (VUỐT LÊN ĐỂ TUNG)
  const coinPanGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(isHost && !isTossing)
      .onBegin(() => {
        'worklet';
        coinScale.value = withSpring(0.92, { damping: 15, stiffness: 220 });
        coinOpacity.value = withTiming(0.85, { duration: 100 });
        runOnJS(triggerHapticLight)();
      })
      .onUpdate((event) => {
        'worklet';
        if (event.translationY < 0) {
          coinTranslateY.value = event.translationY;
        } else {
          coinTranslateY.value = event.translationY * 0.15;
        }
      })
      .onEnd((event) => {
        'worklet';
        if (event.translationY < -80 || event.velocityY < -400) {
          runOnJS(triggerHapticHeavy)();
          runOnJS(launchCoinToss)();
        } else {
          coinTranslateY.value = withSpring(0, { damping: 14, stiffness: 180 });
          coinScale.value = withSpring(1, { damping: 14, stiffness: 180 });
          coinOpacity.value = withTiming(1, { duration: 150 });
        }
      })
      .onFinalize(() => {
        'worklet';
        if (coinTranslateY.value !== -450) {
          coinOpacity.value = withTiming(1, { duration: 150 });
        }
      });
  }, [isHost, isTossing, myAddress, amount, usdcBalance, isWalletReady, members]);

  // 4. GESTURE DETECTOR CHO NÚT HÀNH ĐỘNG (VUỐT HOẶC CHẠM ĐỂ TUNG)
  const buttonGesture = useMemo(() => {
    const buttonPan = Gesture.Pan()
      .enabled(isHost && !isTossing && isWalletReady)
      .activeOffsetY([-8, 8])
      .onBegin(() => {
        'worklet';
        runOnJS(triggerHapticLight)();
      })
      .onUpdate((e) => {
        'worklet';
        if (e.translationY < 0) {
          buttonTranslateY.value = e.translationY * 0.35;
        }
      })
      .onEnd((e) => {
        'worklet';
        buttonTranslateY.value = withSpring(0, { damping: 14, stiffness: 180 });
        if (e.translationY < -25 || e.velocityY < -250) {
          runOnJS(triggerHapticHeavy)();
          runOnJS(launchCoinToss)();
        }
      });

    const buttonTap = Gesture.Tap()
      .enabled(isHost && !isTossing && isWalletReady)
      .onEnd(() => {
        'worklet';
        runOnJS(triggerHapticHeavy)();
        runOnJS(launchCoinToss)();
      });

    return Gesture.Race(buttonPan, buttonTap);
  }, [isHost, isTossing, isWalletReady, amount, members]);

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

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: buttonTranslateY.value }],
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
      const success = await broadcastInvite(roomId, [targetUser.user_id], {
        roomType: 'coin_toss',
        note: 'Vào phòng tung đồng xu nhận lì xì USDC may mắn!',
      });
      if (success) {
        setInvitedUserIds((prev) =>
          prev.includes(targetUser.user_id) ? prev : [...prev, targetUser.user_id]
        );
        Alert.alert('Đã gửi lời mời! 📩', `Đã gửi lời mời tham gia phòng tới ${targetUser.name}`);
      } else {
        Alert.alert('Thông báo', 'Không thể gửi lời mời. Vui lòng kiểm tra lại kết nối mạng.');
      }
    } catch (e) {
      console.log('Error inviting:', e);
    }
  };

  // Chia sẻ mã phòng qua Share API
  const handleShareRoom = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        title: 'Tham gia phòng Lì Xì N.E.D!',
        message: `Mời bạn vào phòng Lì Xì Tung Đồng Xu may mắn trên N.E.D Wallet! Mã phòng: ${roomId}`,
      });
    } catch (err) {
      console.log('Error sharing room:', err);
    }
  };

  // Host xóa thành viên khỏi phòng (Kick)
  const handleKickMember = (targetUserId: string, targetName: string) => {
    if (!isHost) return;
    Alert.alert(
      'Xóa thành viên',
      `Bạn có chắc muốn mời ${targetName} ra khỏi phòng lì xì không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            setMembers((prev) => prev.filter((m) => m.user_id !== targetUserId));
            setInvitedUserIds((prev) => prev.filter((id) => id !== targetUserId));
            roomChannelRef.current?.send({
              type: 'broadcast',
              event: 'room_kick',
              payload: { target_user_id: targetUserId },
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  // Thay đổi số tiền lì xì và đồng bộ tới các Guest
  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    setAmount(cleaned);
    if (isHost && roomChannelRef.current) {
      roomChannelRef.current.send({
        type: 'broadcast',
        event: 'room_amount_update',
        payload: { amount: cleaned },
      });
    }
  };

  // Chọn nhanh số tiền preset
  const handlePresetSelect = (val: string) => {
    Haptics.selectionAsync();
    setAmount(val);
    if (isHost && roomChannelRef.current) {
      roomChannelRef.current.send({
        type: 'broadcast',
        event: 'room_amount_update',
        payload: { amount: val },
      });
    }
  };

  // Thêm thành viên demo (dành cho môi trường test nếu chưa có guest thực)
  const handleAddTestGuest = () => {
    const testGuest: RoomMember = {
      user_id: `guest_test_${Date.now()}`,
      name: 'Bạn Lộc Phát',
      avatar: 'LP',
      wallet_address: '7f9oZqD1Z41XvF9mG1PcvxZJ8fQnLm1A4h9uBvK6demo',
      is_host: false,
      joined_at: Date.now(),
    };
    setMembers((prev) => [...prev, testGuest]);
    setShowInviteModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const copyRoomId = async () => {
    await Clipboard.setStringAsync(roomId);
    Alert.alert('Thông báo', 'Đã sao chép mã phòng!');
  };

  const formatAmountDisplay = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FDF8F5" />

        {/* 1. NỀN & CẤU TRÚC HEADER */}
        <View style={styles.header}>
          {/* Nút Back tròn, viền đen 2px, bóng cứng 2px 2px */}
          <View style={styles.backBtnWrapper}>
            <View style={styles.backBtnShadow} />
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.8}
            >
              <Feather name="chevron-left" size={24} color="#000000" />
            </TouchableOpacity>
          </View>

          {/* Room Code & Host Avatar */}
          <TouchableOpacity
            style={styles.roomCenterWrapper}
            onPress={copyRoomId}
            activeOpacity={0.8}
          >
            <View style={styles.headerHostCol}>
              <View style={styles.headerHostCircle}>
                <Text style={styles.headerHostText}>H</Text>
              </View>
              <View style={styles.headerHostPill}>
                <Text style={styles.headerHostPillText}>Host</Text>
              </View>
            </View>

            <View style={styles.roomPill}>
              <Text style={styles.roomPillText}>
                ROOM: {roomId.length > 14 ? roomId.slice(0, 12) + '...' : roomId}
              </Text>
              <Feather name="copy" size={12} color="#000000" style={{ marginLeft: 6 }} />
            </View>
          </TouchableOpacity>

          {/* Nút Invite góc phải: Vuông bo góc, viền đen 2px, bóng cứng 2px 2px */}
          {isHost ? (
            <View style={styles.inviteBtnWrapper}>
              <View style={styles.inviteBtnShadow} />
              <TouchableOpacity
                style={styles.inviteHeaderBtn}
                onPress={() => setShowInviteModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add" size={18} color="#000000" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: 42 }} />
          )}
        </View>

        {/* Thanh phân cách ngang đậm chất Neo-brutalism */}
        <View style={styles.headerDivider} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 2. KHU VỰC NGƯỜI TRONG PHÒNG (PARTICIPANTS) */}
          <View style={styles.participantsSection}>
            <Text style={styles.participantsTitle}>
              Người trong phòng ({members.length})
            </Text>

            <View style={styles.participantsRow}>
              {/* Host & Thành viên trong phòng */}
              {members.map((m) => {
                const displayInitial = m.is_host ? 'H' : (m.avatar || 'U');
                return (
                  <TouchableOpacity
                    key={m.user_id}
                    style={styles.participantItem}
                    onPress={() => {
                      if (isHost && !m.is_host) {
                        handleKickMember(m.user_id, m.name);
                      }
                    }}
                    activeOpacity={isHost && !m.is_host ? 0.7 : 1}
                  >
                    <View style={styles.participantAvatarCircle}>
                      {m.avatar_url ? (
                        <Image source={{ uri: m.avatar_url }} style={styles.participantAvatarImg} />
                      ) : (
                        <Text style={styles.participantAvatarText}>{displayInitial}</Text>
                      )}
                      {isHost && !m.is_host && (
                        <View style={styles.removeMemberBadge}>
                          <Ionicons name="close" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <View style={styles.participantRolePill}>
                      <Text style={styles.participantRolePillText} numberOfLines={1}>
                        {m.is_host ? 'Host' : (m.name.length > 8 ? m.name.slice(0, 7) + '..' : m.name)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Slot trống: Nền đứt khúc (dashed), dấu +, label "+ Invite" */}
              {isHost && (
                <TouchableOpacity
                  style={styles.participantItem}
                  onPress={() => setShowInviteModal(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.emptySlotCircle}>
                    <Feather name="plus" size={22} color="#000000" />
                  </View>
                  <View style={styles.inviteSlotPill}>
                    <Text style={styles.inviteSlotPillText}>+ Invite</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* 3. KHU VỰC TRUNG TÂM (ĐỒNG XU & SỐ TIỀN) */}
          <View style={styles.centerSection}>
            <Text style={styles.amountTitleText}>
              Số lượng Lì Xì (USDC/Stablecoin):
            </Text>

            {/* Input Số tiền: Khối chữ nhật nền trắng, viền đen 3px, bóng đổ cứng 4px 4px */}
            <View style={styles.amountBoxWrapper}>
              <View style={styles.amountBoxShadow} />
              <View style={styles.amountBoxFront}>
                <Text style={styles.dollarPrefix}>$</Text>
                <TextInput
                  style={styles.amountInputField}
                  value={amount}
                  onChangeText={handleAmountChange}
                  keyboardType="decimal-pad"
                  placeholder="5.00"
                  placeholderTextColor="#A0AEC0"
                  editable={isHost && !isTossing}
                />
              </View>
            </View>

            {/* Hiển thị số dư USDC thực tế */}
            {usdcBalance !== null && (
              <Text style={styles.balanceSubtext}>
                Số dư khả dụng: ${usdcBalance.toFixed(2)} USDC
              </Text>
            )}

            {/* Mũi tên kép >> (xoay dọc) báo hiệu vuốt lên */}
            <View style={styles.coinTopChevrons}>
              <Feather name="chevrons-up" size={30} color="#000000" />
            </View>

            {/* Đồng xu Lì Xì Neo-brutalism: Gold, viền đen 5px, gờ trong, Dollar $ siêu to, bóng cứng lệch 8x8 */}
            <View style={styles.coinArena}>
              <GestureDetector gesture={coinPanGesture}>
                <Animated.View style={[styles.coin3DWrapper, animatedCoinStyle]}>
                  {/* Bóng cứng màu đen 8px 8px */}
                  <View style={styles.coinHardShadow} />
                  {/* Thân đồng xu vàng gold */}
                  <View style={styles.coinOuterBody}>
                    {/* Vòng tròn viền đen mỏng hơn bên trong tạo gờ */}
                    <View style={styles.coinInnerRing}>
                      <Text style={styles.coinDollarSymbol}>$</Text>
                    </View>
                  </View>
                </Animated.View>
              </GestureDetector>
            </View>
          </View>

          {/* 4. BỘ CHỌN SỐ TIỀN NHANH (PRESET PILLS) */}
          <View style={styles.presetPillsRow}>
            {PRESET_AMOUNTS.map((item) => {
              const isSelected = parseFloat(amount) === parseFloat(item.value);
              return (
                <View key={item.value} style={styles.presetPillWrapper}>
                  <View style={styles.presetPillShadow} />
                  <TouchableOpacity
                    style={[
                      styles.presetPillFront,
                      { backgroundColor: item.bg },
                      isSelected && styles.presetPillActive,
                    ]}
                    onPress={() => handlePresetSelect(item.value)}
                    disabled={!isHost || isTossing}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.presetPillText, { color: item.textColor }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* 5. NÚT HÀNH ĐỘNG / SWIPE AREA */}
          <View style={styles.actionSection}>
            <Text style={styles.swipeHintText}>Vuốt lên để tung đồng xu</Text>

            {isHost ? (
              <GestureDetector gesture={buttonGesture}>
                <Animated.View style={[styles.actionButtonWrapper, animatedButtonStyle]}>
                  {/* Bóng cứng 5px 5px */}
                  <View style={styles.actionButtonShadow} />
                  {/* Nút chữ nhật to, nền Tím, viền đen 3px */}
                  <TouchableOpacity
                    style={[
                      styles.actionButtonFront,
                      (isTossing || !isWalletReady) && styles.actionButtonDisabled,
                    ]}
                    onPress={launchCoinToss}
                    disabled={isTossing || !isWalletReady}
                    activeOpacity={0.9}
                  >
                    {isTossing ? (
                      <View style={styles.btnInner}>
                        <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.actionButtonText}>
                          {statusMessage || 'Đang trao thưởng On-chain...'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.actionButtonText}>
                        Tung ngay ($ {formatAmountDisplay(amount)})
                      </Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </GestureDetector>
            ) : (
              <View style={styles.guestWaitingBox}>
                <Text style={styles.guestWaitingTitle}>🎁 Chờ Host Tung Đồng Xu</Text>
                <Text style={styles.guestWaitingDesc}>
                  Khi Host vuốt tung đồng xu, hệ thống sẽ chọn ngẫu nhiên 1 người trong phòng để nhận lì xì USDC trực tiếp on-chain!
                </Text>
              </View>
            )}

            {/* Icon mũi tên kép dưới cùng */}
            <View style={styles.bottomChevronsContainer}>
              <Feather name="chevrons-up" size={26} color="#000000" />
            </View>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* MODAL CHIẾN THẮNG (WINNER CELEBRATION MODAL) THEO PHONG CÁCH NEO-BRUTALISM */}
        <Modal
          visible={showWinnerModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowWinnerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.winnerCardWrapper, animatedWinnerModalStyle]}>
              <View style={styles.winnerCardShadow} />
              <View style={styles.winnerCard}>
                {/* Mascot chú gấu tím ăn mừng hào hứng (Exciting Mascot) */}
                <View style={styles.winnerMascotWrapper}>
                  <Image
                    source={require('@/assets/images/mascot teddy - exciting.png')}
                    style={styles.winnerMascotImg}
                    resizeMode="contain"
                  />
                </View>

                <Text style={styles.winnerCardHeading}>
                  {winner?.user_id === user?.id
                    ? 'CHÚC MỪNG BẠN ĐÃ TRÚNG THƯỞNG!'
                    : 'NGƯỜI MAY MẮN NHẤT PHÒNG!'}
                </Text>

                <View style={styles.winnerAvatarLarge}>
                  {winner?.avatar_url ? (
                    <Image source={{ uri: winner.avatar_url }} style={styles.winnerAvatarLargeImg} />
                  ) : (
                    <Text style={styles.winnerAvatarLargeText}>
                      {winner?.avatar || 'W'}
                    </Text>
                  )}
                </View>

                <Text style={styles.winnerNameText}>{winner?.name}</Text>
                <Text style={styles.winnerWalletText}>
                  {winner?.wallet_address
                    ? `${winner.wallet_address.slice(0, 6)}...${winner.wallet_address.slice(-6)}`
                    : ''}
                </Text>

                <View style={styles.rewardPillWrapper}>
                  <View style={styles.rewardPillShadow} />
                  <View style={styles.rewardPill}>
                    <Text style={styles.rewardPillText}>
                      +${wonAmount ? wonAmount.toFixed(2) : '0.00'} USDC
                    </Text>
                  </View>
                </View>

                <View style={styles.closeWinnerBtnWrapper}>
                  <View style={styles.closeWinnerBtnShadow} />
                  <TouchableOpacity
                    style={styles.closeWinnerBtn}
                    onPress={() => setShowWinnerModal(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.closeWinnerBtnText}>Tuyệt Vời! Tiếp Tục Chơi</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </View>
        </Modal>

        {/* MODAL MỜI BẠN BÈ XUNG QUANH (PRESENCE DISCOVERY) THEO CHUẨN NEO-BRUTALISM */}
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
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={22} color="#000000" />
                </TouchableOpacity>
              </View>

              {/* Nút chia sẻ mã phòng / link mời nhanh */}
              <TouchableOpacity
                style={styles.shareRoomActionBtn}
                onPress={handleShareRoom}
                activeOpacity={0.8}
              >
                <Feather name="share-2" size={16} color="#000000" style={{ marginRight: 8 }} />
                <Text style={styles.shareRoomActionBtnText}>
                  Chia sẻ mã phòng: {roomId}
                </Text>
              </TouchableOpacity>

              <ScrollView style={{ maxHeight: 300 }}>
                {nearbyUsers.map((u) => {
                  const isAlreadyIn = members.some((m) => m.user_id === u.user_id);
                  const isInvited = invitedUserIds.includes(u.user_id);

                  return (
                    <View key={u.user_id} style={styles.nearbyUserRow}>
                      <View style={styles.nearbyAvatar}>
                        {u.avatar_url ? (
                          <Image source={{ uri: u.avatar_url }} style={styles.nearbyAvatarImg} />
                        ) : (
                          <Text style={styles.nearbyAvatarText}>{u.avatar}</Text>
                        )}
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
                          <Text style={styles.alreadyInText}>Đã vào</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.inviteBtn,
                            isInvited && styles.inviteBtnSent,
                          ]}
                          onPress={() => handleInviteUser(u)}
                          disabled={isInvited}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.inviteBtnText,
                              isInvited && styles.inviteBtnTextSent,
                            ]}
                          >
                            {isInvited ? 'Đã gửi' : 'Mời'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}

                {nearbyUsers.length === 0 && (
                  <View style={styles.emptyNearbyBox}>
                    <Feather name="users" size={32} color="#94A3B8" />
                    <Text style={styles.emptyNearbyText}>
                      Chưa phát hiện thiết bị nào khác đang mở app quanh đây. Bạn có thể sao chép mã phòng hoặc bấm nút chia sẻ ở trên để mời bạn bè!
                    </Text>

                    {/* Nút bổ sung người chơi Test cho Dev/Demo */}
                    <TouchableOpacity
                      style={styles.addTestPlayerBtn}
                      onPress={handleAddTestGuest}
                      activeOpacity={0.8}
                    >
                      <Feather name="user-check" size={16} color="#000000" style={{ marginRight: 6 }} />
                      <Text style={styles.addTestPlayerBtnText}>
                        + Thêm người chơi giả lập (Test Devnet)
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal Khôi phục Ví nếu cần */}
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
    backgroundColor: '#FDF8F5',
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // 1. HEADER STYLES
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#FDF8F5',
  },
  backBtnWrapper: {
    width: 42,
    height: 42,
    position: 'relative',
  },
  backBtnShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#000000',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomCenterWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerHostCol: {
    alignItems: 'center',
    marginRight: 8,
  },
  headerHostCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerHostText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },
  headerHostPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: -6,
    zIndex: 2,
  },
  headerHostPillText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#000000',
  },
  roomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roomPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
  inviteBtnWrapper: {
    width: 42,
    height: 42,
    position: 'relative',
  },
  inviteBtnShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#000000',
  },
  inviteHeaderBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#FFD8A8',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerDivider: {
    height: 2,
    backgroundColor: '#000000',
    marginHorizontal: 20,
    marginBottom: 12,
  },

  // 2. PARTICIPANTS STYLES
  participantsSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  participantsTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 10,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  participantAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantAvatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
  },
  participantAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  removeMemberBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantRolePill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 1.5,
    marginTop: -8,
    zIndex: 2,
  },
  participantRolePillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
  },
  emptySlotCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FDF8F5',
    borderWidth: 2,
    borderColor: '#000000',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteSlotPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 1.5,
    marginTop: -8,
    zIndex: 2,
  },
  inviteSlotPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
  },

  // 3. CENTER (AMOUNT & COIN) STYLES
  centerSection: {
    alignItems: 'center',
    marginTop: 4,
  },
  amountTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  amountBoxWrapper: {
    width: 220,
    height: 52,
    position: 'relative',
    alignSelf: 'center',
  },
  amountBoxShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 220,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#000000',
  },
  amountBoxFront: {
    width: 220,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  dollarPrefix: {
    fontSize: 26,
    fontWeight: '900',
    color: '#000000',
    marginRight: 6,
  },
  amountInputField: {
    fontSize: 26,
    fontWeight: '900',
    color: '#000000',
    minWidth: 90,
    padding: 0,
    textAlign: 'left',
  },
  balanceSubtext: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 6,
  },
  coinTopChevrons: {
    marginTop: 12,
    marginBottom: 4,
    alignItems: 'center',
  },
  coinArena: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  coin3DWrapper: {
    width: 154,
    height: 154,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  coinHardShadow: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 154,
    height: 154,
    borderRadius: 77,
    backgroundColor: '#000000',
  },
  coinOuterBody: {
    width: 154,
    height: 154,
    borderRadius: 77,
    backgroundColor: '#FFD700',
    borderWidth: 5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinInnerRing: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 2.5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinDollarSymbol: {
    fontSize: 58,
    fontWeight: '900',
    color: '#000000',
    lineHeight: 64,
    textAlign: 'center',
  },

  // 4. PRESET PILLS STYLES
  presetPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginVertical: 14,
  },
  presetPillWrapper: {
    flex: 1,
    height: 38,
    marginHorizontal: 4,
    position: 'relative',
  },
  presetPillShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: -2,
    bottom: -2,
    backgroundColor: '#000000',
    borderRadius: 19,
  },
  presetPillFront: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetPillActive: {
    borderWidth: 2.5,
    transform: [{ scale: 1.04 }],
  },
  presetPillText: {
    fontSize: 14,
    fontWeight: '900',
  },

  // 5. ACTION BUTTON & SWIPE AREA STYLES
  actionSection: {
    paddingHorizontal: 20,
    marginTop: 6,
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 10,
  },
  actionButtonWrapper: {
    width: '100%',
    height: 56,
    position: 'relative',
  },
  actionButtonShadow: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: -5,
    bottom: -5,
    backgroundColor: '#000000',
    borderRadius: 16,
  },
  actionButtonFront: {
    width: '100%',
    height: '100%',
    backgroundColor: '#8A2BE2',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  actionButtonDisabled: {
    backgroundColor: '#C4B5FD',
  },
  actionButtonText: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestWaitingBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000000',
    padding: 16,
    alignItems: 'center',
  },
  guestWaitingTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 6,
  },
  guestWaitingDesc: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomChevronsContainer: {
    alignItems: 'center',
    marginTop: 14,
  },

  // MODAL STYLES (NEO-BRUTALISM)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  winnerCardWrapper: {
    width: '100%',
    position: 'relative',
  },
  winnerCardShadow: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: -6,
    bottom: -6,
    backgroundColor: '#000000',
    borderRadius: 24,
  },
  winnerCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#000000',
    padding: 24,
    alignItems: 'center',
  },
  winnerMascotWrapper: {
    width: 140,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  winnerMascotImg: {
    width: 135,
    height: 115,
  },
  winnerCardHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },
  winnerAvatarLarge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFD700',
    borderWidth: 3,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  winnerAvatarLargeImg: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
  },
  winnerAvatarLargeText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#000000',
  },
  winnerNameText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 2,
  },
  winnerWalletText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 16,
  },
  rewardPillWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  rewardPillShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: -2,
    bottom: -2,
    backgroundColor: '#000000',
    borderRadius: 16,
  },
  rewardPill: {
    backgroundColor: '#00E5FF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000000',
  },
  rewardPillText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
  },
  txBox: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#000000',
    padding: 10,
    borderRadius: 10,
    width: '100%',
    marginBottom: 18,
  },
  txBoxLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 2,
  },
  txBoxValue: {
    fontSize: 11,
    color: '#8A2BE2',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  closeWinnerBtnWrapper: {
    width: '100%',
    height: 50,
    position: 'relative',
  },
  closeWinnerBtnShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: -3,
    bottom: -3,
    backgroundColor: '#000000',
    borderRadius: 14,
  },
  closeWinnerBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#8A2BE2',
    borderWidth: 2.5,
    borderColor: '#000000',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeWinnerBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // INVITE BOTTOM SHEET STYLES
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  inviteSheet: {
    backgroundColor: '#FDF8F5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: '#000000',
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
    fontWeight: '900',
    color: '#000000',
  },
  sheetSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  closeSheetBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E5E7EB',
  },
  nearbyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nearbyAvatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
  },
  nearbyAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  shareRoomActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD8A8',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  shareRoomActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
  nearbyInfo: {
    flex: 1,
  },
  nearbyName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  nearbyDist: {
    fontSize: 12,
    color: '#64748B',
  },
  alreadyInBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  alreadyInText: {
    fontSize: 11,
    color: '#000000',
    fontWeight: '700',
  },
  inviteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#00E5FF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000000',
  },
  inviteBtnSent: {
    backgroundColor: '#E5E7EB',
  },
  inviteBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  inviteBtnTextSent: {
    color: '#64748B',
  },
  emptyNearbyBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyNearbyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  addTestPlayerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD8A8',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addTestPlayerBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
  },
});
