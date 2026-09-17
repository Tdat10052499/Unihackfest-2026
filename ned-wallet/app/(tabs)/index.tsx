import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  InteractionManager,
  AppState,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, Redirect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  usePrivy,
  useEmbeddedSolanaWallet,
  useEmbeddedWallet,
} from '@privy-io/expo';
import {
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getSolanaBalance,
  getAccountDisplayBalance,
  formatFiatBalance,
  AccountDisplayBalance,
  solanaConnection,
  fetchOnChainHistory,
  ActivityItem,
} from '@/services/solana';
import {
  cacheBalance,
  getCachedBalance,
  cacheActivities,
  getCachedActivities,
  getLinkedPhone,
  setLinkedPhone,
} from '@/services/storage';
import {
  getUserPhoneNumberFromDB,
  resolveActiveSolanaAddress,
} from '@/services/identity';
import { useUserStore } from '@/stores/useUserStore';
import { useOnchainTransfer } from '@/hooks/useOnchainTransfer';
import { useTranslation } from '@/services/i18n';
import { DepositModal } from '@/components/DepositModal';
import { SendModal } from '@/components/SendModal';
import { PhoneLinkingModal } from '@/components/PhoneLinkingModal';
import { PhoneManagementModal } from '@/components/PhoneManagementModal';
import { WalletRecoveryModal } from '@/components/WalletRecoveryModal';
import { NeoPhysicalWalletCard, StablecoinCardData } from '@/components/neo/NeoPhysicalWalletCard';
import { AddSubWalletModal } from '@/components/neo/AddSubWalletModal';
import { NeoSwapModal, StablecoinBalances } from '@/components/neo/NeoSwapModal';
import { useSubWallets, SubWalletItem } from '@/hooks/useSubWallets';
import { useOnchainBalance } from '@/hooks/useOnchainBalance';
import { useExternalWallet } from '@/src/providers/WalletProvider';
import { useWalletCardsStore } from '@/stores/useWalletCardsStore';
import { AddStablecoinModal } from '@/components/neo/AddStablecoinModal';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { NotificationModal } from '@/components/NotificationModal';
import LoginScreen from '../login';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isNight, greeting } = useTimeOfDay();
  const { t } = useTranslation();
  
  const { isReady, user, logout } = usePrivy();
  const externalWallet = useExternalWallet();
  const solanaWalletState = useEmbeddedSolanaWallet();
  const embeddedWalletState = useEmbeddedWallet();
  
  const { username, avatarUrl, loadFromStorage, fetchUserProfile } = useUserStore();

  const {
    transfer: executeTokenTransfer,
    isTransferring: isExecutingTransfer,
    isWalletReady,
    needsRecovery: isNeedsRecovery,
    walletStatus,
  } = useOnchainTransfer();

  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // State số dư & tiền tệ (USD / VND)
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [accountBalanceState, setAccountBalanceState] = useState<AccountDisplayBalance | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'VND'>('USD');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State Modals & Camera Scanner
  const [showScanner, setShowScanner] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showPhoneLinkingModal, setShowPhoneLinkingModal] = useState(false);
  const [showPhoneManagementModal, setShowPhoneManagementModal] = useState(false);
  const [linkedPhoneState, setLinkedPhoneState] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const isScanningLocked = useRef(false);

  // State Withdraw / Send Recipient & Broadcast Loading
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [isSendingTx, setIsSendingTx] = useState(false);

  // State danh sách lịch sử giao dịch (dùng cho tính toán số liệu)
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Trích xuất địa chỉ ví Solana dạng Base58
  const getSolanaWalletAddress = (): string | null => {
    return resolveActiveSolanaAddress(
      user,
      externalWallet,
      solanaWalletState,
      useUserStore.getState().walletAddress
    );
  };

  const solanaAddress = getSolanaWalletAddress();

  // Hook truy xuất số dư On-chain thực tế
  const {
    usdcBalance: onchainUsdcBalance,
    formattedUsd: onchainFormattedUsd,
    formattedVnd: onchainFormattedVnd,
    refreshBalance: refreshOnchainBalance,
  } = useOnchainBalance(solanaAddress);

  // Quản lý Ví Tiền Tệ Phụ (Sub-wallets) & Swap
  const { subWallets, addSubWallet, executeSwap } = useSubWallets(
    user?.id || externalWallet?.publicKey?.toBase58(),
    onchainUsdcBalance
  );
  const [showAddSubWalletModal, setShowAddSubWalletModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedSubWalletForSwap, setSelectedSubWalletForSwap] = useState<SubWalletItem | null>(null);
  
  // Wallet Cards Store
  const { walletCards, loadCardsForWallet, resetCards } = useWalletCardsStore();
  const [showAddStablecoinModal, setShowAddStablecoinModal] = useState(false);

  // Hệ thống Thông báo (In-app Notifications)
  const { unreadCount } = useNotificationStore();
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Quản lý Số dư Độc lập cho từng loại Stablecoin
  const [stablecoinBalances, setStablecoinBalances] = useState<StablecoinBalances>({
    USDC: 0.0, // Khởi tạo $0, sẽ được đồng bộ từ on-chain
    EURC: 0.0,
    PYUSD: 0.0,
  });
  const [activeCardCurrency, setActiveCardCurrency] = useState<string>('USDC');

  // Đồng bộ thẻ theo từng ví (walletAddress), cô lập dữ liệu và fetch từ Supabase
  useEffect(() => {
    if (solanaAddress) {
      loadCardsForWallet(solanaAddress, username || 'N.E.D User');
    } else {
      resetCards();
    }
  }, [solanaAddress, username]);

  useEffect(() => {
    if (onchainUsdcBalance !== undefined && onchainUsdcBalance !== null) {
      setStablecoinBalances((prev) => ({
        ...prev,
        USDC: onchainUsdcBalance,
      }));
    }
  }, [onchainUsdcBalance]);

  const handleConfirmSwap = async (
    fromCur: string,
    toCur: string,
    fromAmt: number,
    toAmt: number
  ) => {
    setStablecoinBalances((prev) => {
      const prevFrom = prev[fromCur as keyof StablecoinBalances] ?? 0;
      const prevTo = prev[toCur as keyof StablecoinBalances] ?? 0;
      return {
        ...prev,
        [fromCur]: Math.max(0, prevFrom - fromAmt),
        [toCur]: prevTo + toAmt,
      };
    });
    return {
      success: true,
      receivedAmount: toAmt,
      currency: toCur,
      symbol: toCur === 'EURC' ? '€' : '$',
    };
  };

  // 1. Tải dữ liệu User Profile & Cache khởi tạo
  useEffect(() => {
    loadFromStorage();
    if (user?.id) {
      fetchUserProfile(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const [cachedBal, cachedActs, linkedPhone] = await Promise.all([
          getCachedBalance(),
          getCachedActivities(),
          getLinkedPhone(),
        ]);
        if (cachedBal !== null) {
          setSolBalance(cachedBal);
        }
        if (cachedActs !== null && cachedActs.length > 0) {
          setActivities(cachedActs);
        }
        if (linkedPhone) {
          setLinkedPhoneState(linkedPhone);
        }
      } catch (err) {
        console.error('Error loading initial cached data:', err);
      }
    };

    loadCachedData();
  }, []);

  // 2. Kiểm tra trạng thái định danh SĐT
  useEffect(() => {
    const checkPhoneLinkingPrompt = async () => {
      if (!user) return;
      try {
        const dbPhone = await getUserPhoneNumberFromDB(user.id);
        if (dbPhone) {
          setLinkedPhoneState(dbPhone);
          await setLinkedPhone(dbPhone);
          return;
        }
        setLinkedPhoneState(null);
      } catch (err) {
        console.error('Error checking phone link prompt:', err);
      }
    };

    checkPhoneLinkingPrompt();
  }, [user]);

  // Lấy số dư On-chain
  const fetchBalance = useCallback(async (address: string) => {
    if (!address) return;
    try {
      const displayData = await getAccountDisplayBalance(address);
      setSolBalance(displayData.solBalance);
      setAccountBalanceState(displayData);
      cacheBalance(displayData.solBalance);
    } catch (err: any) {
      console.log('Error fetching Devnet balance:', err);
    }
  }, []);

  // Lấy lịch sử giao dịch On-chain
  const fetchActivities = useCallback(async (address: string, force: boolean = false) => {
    if (!address) return;
    try {
      const onChainList = await fetchOnChainHistory(address, force);
      if (onChainList && Array.isArray(onChainList)) {
        setActivities(onChainList);
        cacheActivities(onChainList);
      }
    } catch (err: any) {
      console.log('Error fetching on-chain history:', err);
    }
  }, []);

  // 3. Tự động làm mới khi chuyển Tab vào Trang Chủ
  useFocusEffect(
    useCallback(() => {
      if (solanaAddress) {
        refreshOnchainBalance(true);
        fetchActivities(solanaAddress, true);
      }
    }, [solanaAddress, refreshOnchainBalance, fetchActivities])
  );

  // 4. Lắng nghe khi App mở lại từ Background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && solanaAddress) {
        refreshOnchainBalance(true);
        fetchActivities(solanaAddress, true);
      }
    });
    return () => sub.remove();
  }, [solanaAddress, refreshOnchainBalance, fetchActivities]);

  // 5. Luồng Auto-Polling Heartbeat & WebSocket Realtime Sync
  useEffect(() => {
    if (!solanaAddress) return;

    let isMounted = true;
    let subscriptionId: number | null = null;
    let debounceTimer: any = null;

    fetchBalance(solanaAddress);
    fetchActivities(solanaAddress, true);

    try {
      const pubKey = new PublicKey(solanaAddress);
      subscriptionId = solanaConnection.onAccountChange(
        pubKey,
        (accountInfo) => {
          const newBalance = accountInfo.lamports / LAMPORTS_PER_SOL;
          setSolBalance((prev) => {
            if (prev !== null && newBalance > prev) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            if (prev !== newBalance) {
              cacheBalance(newBalance);
              return newBalance;
            }
            return prev;
          });

          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            if (isMounted) {
              fetchActivities(solanaAddress, true);
              useNotificationStore.getState().loadNotifications(solanaAddress, true);
            }
          }, 1500);
        },
        'confirmed'
      );
    } catch (err) {
      console.error('Error setting up onAccountChange WebSocket listener:', err);
    }

    const pollInterval = setInterval(async () => {
      if (!isMounted) return;
      try {
        const latestBal = await getSolanaBalance(solanaAddress);
        setSolBalance((prev) => {
          if (prev !== null && latestBal !== prev) {
            cacheBalance(latestBal);
            if (latestBal > prev) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            fetchActivities(solanaAddress, true);
            useNotificationStore.getState().loadNotifications(solanaAddress, true);
            return latestBal;
          } else if (prev === null) {
            cacheBalance(latestBal);
            return latestBal;
          }
          return prev;
        });
      } catch (e) {
        // RPC error ignored
      }
    }, 7000);

    return () => {
      isMounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(pollInterval);
      if (subscriptionId !== null) {
        solanaConnection.removeAccountChangeListener(subscriptionId).catch((e) => {
          console.log('Error removing account change listener:', e);
        });
      }
    };
  }, [solanaAddress, fetchBalance, fetchActivities]);

  // Vuốt để làm mới (Pull-to-Refresh)
  const handlePullToRefresh = useCallback(async () => {
    if (!solanaAddress) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchBalance(solanaAddress),
        refreshOnchainBalance(true),
        fetchActivities(solanaAddress, true),
      ]);
    } catch (err) {
      console.log('Error refreshing data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [solanaAddress, fetchBalance, refreshOnchainBalance, fetchActivities]);

  // Mở màn hình Camera quét mã QR
  const handleOpenScanner = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          'Quyền Camera',
          'Cần cấp quyền truy cập camera để quét mã QR thanh toán.'
        );
        return;
      }
    }
    isScanningLocked.current = false;
    setHasScanned(false);
    setShowScanner(true);
  };

  // Quét QR thành công -> Điều hướng sang Send
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (isScanningLocked.current) return;
    isScanningLocked.current = true;
    setHasScanned(true);
    setShowScanner(false);

    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        router.push({ pathname: '/send', params: { recipient: data } });
      }, 350);
    });
  };

  // Gửi giao dịch chuyển tiền
  const handleSendTransaction = async (
    targetAddress?: string,
    amountSol?: number
  ) => {
    if (!solanaAddress) {
      Alert.alert('Thông báo', 'Không tìm thấy địa chỉ ví nguồn.');
      return;
    }

    const recipientInput = (targetAddress || withdrawAddress).trim();
    if (!recipientInput) {
      Alert.alert('Thông báo', 'Vui lòng nhập địa chỉ ví hoặc số điện thoại người nhận.');
      return;
    }

    if (!isWalletReady) {
      Alert.alert(
        'Ví đang kết nối',
        `Ví nhúng đang ở trạng thái (${walletStatus}). Vui lòng chờ vài giây để kết nối hoàn tất!`
      );
      return;
    }

    const numAmount = amountSol || 0.001;
    setIsSendingTx(true);

    try {
      const result = await executeTokenTransfer({
        fromAddress: solanaAddress,
        recipientAddressOrPhone: recipientInput,
        amountSol: numAmount,
      });

      if (!result.success || !result.transactionHash) {
        setIsSendingTx(false);
        const errorMsg = result.error || 'Không thể thực hiện giao dịch.';
        if (
          errorMsg.includes('timeout') ||
          errorMsg.includes('user-signer') ||
          errorMsg.includes('WebView')
        ) {
          Alert.alert(
            'Phiên làm việc bị gián đoạn ⚠️',
            'Phiên kết nối ví ngầm trên thiết bị Android đang bị treo bởi hệ thống. Bạn có muốn dọn dẹp và làm mới phiên đăng nhập ngay?',
            [
              { text: 'Đóng', style: 'cancel' },
              {
                text: 'Làm mới ngay',
                style: 'destructive',
                onPress: async () => {
                  const { executeHardReset } = await import('@/services/storage');
                  await executeHardReset(logout);
                  router.replace('/login');
                },
              },
            ]
          );
          return;
        }

        if (errorMsg.includes('hết hạn') || errorMsg.includes('đăng nhập lại') || errorMsg.includes('access token')) {
          Alert.alert(
            'Phiên hết hạn ⚠️',
            'Phiên đăng nhập đã hết hạn hoặc được làm mới. Vui lòng đăng nhập lại để tiếp tục.',
            [
              {
                text: 'Đăng nhập lại',
                onPress: () => router.replace('/login'),
              },
            ]
          );
          return;
        }

        Alert.alert('Giao dịch chưa hoàn tất ❌', errorMsg);
        return;
      }

      const txSignature = result.transactionHash;
      const finalRecipient = result.recipientAddress || recipientInput;

      setShowWithdrawModal(false);

      const newAct: ActivityItem = {
        id: txSignature,
        type: 'sent',
        title: 'Chuyển tiền',
        time: 'Vừa xong',
        amount: `-$${(numAmount * 150).toFixed(2)}`,
        isPositive: false,
        iconBg: '#374151',
        signature: txSignature,
      };

      setActivities((prev) => {
        const updated = [newAct, ...prev.filter((a) => a.id !== txSignature)];
        cacheActivities(updated);
        return updated;
      });

      setSolBalance((prev) =>
        prev !== null ? Math.max(0, prev - numAmount - 0.000005) : prev
      );

      setIsSendingTx(false);

      Alert.alert(
        'Chuyển Tiền Thành Công! ⚡',
        `Đã chuyển $${numAmount.toFixed(2)} đến:\n${finalRecipient.length > 12 ? `${finalRecipient.slice(0, 6)}...${finalRecipient.slice(-6)}` : finalRecipient}\n\nMã giao dịch: ${txSignature.slice(0, 16)}...`
      );
    } catch (err: any) {
      setIsSendingTx(false);
      console.error('Send Transaction Error:', err);
      Alert.alert(
        'Lỗi Giao Dịch',
        err?.message || 'Không thể thực hiện chuyển tiền lúc này.'
      );
    }
  };

  // Format số dư hiển thị
  const getFormattedDisplayBalance = (): string => {
    if (accountBalanceState) {
      return currency === 'USD'
        ? accountBalanceState.formattedUsd
        : accountBalanceState.formattedVnd;
    }
    if (onchainFormattedUsd && onchainFormattedUsd !== '$0.00') {
      return currency === 'USD' ? onchainFormattedUsd : onchainFormattedVnd;
    }
    if (solBalance !== null) {
      return formatFiatBalance(solBalance * 150, currency);
    }
    return '$4,309,573.02';
  };

  // Trích xuất username hiển thị
  const getUserEmailPrefix = (): string | null => {
    if (!user) return null;
    const emailAccount = (user.linked_accounts || (user as any).linkedAccounts || [])?.find(
      (acc: any) => acc.type === 'email'
    );
    if (emailAccount && (emailAccount as any).address) {
      return (emailAccount as any).address.split('@')[0];
    }
    return null;
  };

  const displayGreetingName = username ? username.split('.')[0] : 'N.E.D User';
  const displayAccountName = username || 'N.E.D User';
  const displayMaskedWallet = solanaAddress
    ? `**** ${solanaAddress.slice(-4)}`
    : '**** 0849';

  // Tính toán tổng Expenses hiển thị
  const calculateTotalExpenses = (): string => {
    const sentTotal = activities
      .filter((a) => a.type === 'sent' || !a.isPositive)
      .reduce((sum, item) => {
        const num = parseFloat(item.amount.replace(/[^0-9.-]+/g, '')) || 0;
        return sum + Math.abs(num);
      }, 0);
    return sentTotal > 0 ? `$ ${sentTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '$ 4,750';
  };

  const isAuthenticated = !!user || !!externalWallet?.publicKey;

  if (!isReady && !externalWallet?.connected) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Đang kết nối tài khoản N.E.D...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <View style={styles.safeContainer}>
      <StatusBar barStyle={isNight ? 'light-content' : 'dark-content'} />

      {/* ========================================================================= */}
      {/* 1. STICKY HEADER (Tự động thích ứng Ban ngày / Ban đêm theo thời gian thực) */}
      {/* ========================================================================= */}
      <View
        style={[
          styles.stickyHeader,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 44 : 24) + 6,
            backgroundColor: isNight ? '#161426' : '#FDF8F5',
          },
        ]}
      >
        {/* Góc trái: Avatar + Lời chào theo thời gian thực (Good Morning/Afternoon/Evening) */}
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity
            style={styles.profileBtnWrapper}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings');
            }}
            activeOpacity={0.85}
          >
            <View style={[styles.profileBtnShadow, isNight && styles.profileBtnShadowNight]} />
            <View style={[styles.profileBtnBody, isNight && styles.profileBtnBodyNight]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <Feather name="user" size={20} color={isNight ? '#FFFFFF' : '#000000'} />
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.headerGreetingCol}>
            <Text
              style={[
                styles.headerGreetingTitle,
                { color: isNight ? '#FFFFFF' : '#000000' },
              ]}
              numberOfLines={1}
            >
              {`${greeting}, ${displayGreetingName}`}
            </Text>
            <Text
              style={[
                styles.headerGreetingSubtitle,
                { color: isNight ? '#A5A1C0' : '#4B5563' },
              ]}
              numberOfLines={1}
            >
              {'Welcome Back!'}
            </Text>
          </View>
        </View>

        {/* Góc phải (Actions Group): flexDirection: 'row', alignItems: 'center', gap: 16 */}
        <View style={styles.actionsGroup}>
          {/* Icon Chuông (Notification) - Style Neo-brutalism */}
          <TouchableOpacity
            style={[styles.bellBtn, isNight ? styles.bellBtnNight : styles.bellBtnDay]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowNotificationModal(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="notifications-outline"
              size={21}
              color={isNight ? '#FFFFFF' : '#000000'}
            />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Mã QR Code: Sử dụng đúng component QR Code mở camera scanner đã cung cấp */}
          <TouchableOpacity
            style={styles.qrCodeBtn}
            onPress={handleOpenScanner}
            activeOpacity={0.7}
          >
            <Ionicons
              name="qr-code-outline"
              size={28}
              color={isNight ? '#FFFFFF' : '#000000'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 2. SCROLLVIEW CHỨA NỘI DUNG CHÍNH (paddingTop tránh bị Header đè khuất) */}
      {/* ========================================================================= */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 44 : 24) + 76,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handlePullToRefresh}
            colors={[isNight ? '#FFFFFF' : '#000000']}
            tintColor={isNight ? '#FFFFFF' : '#000000'}
            progressViewOffset={Math.max(insets.top, Platform.OS === 'ios' ? 44 : 24) + 68}
          />
        }
      >

        {/* ========================================================================= */}
        {/* 3. VÍ VẬT LÝ CHỨA THẺ STABLECOIN (Physical Wallet Card - Swap Button) */}
        {/* ========================================================================= */}
        <NeoPhysicalWalletCard
          cards={walletCards.map(card => {
            let balance = 0;
            let formatted = '$0.00';
            
            if (card.currency === 'USDC') {
               balance = stablecoinBalances.USDC;
               formatted = `$${balance.toFixed(2)}`;
            } else if (card.currency === 'EURC') {
               balance = stablecoinBalances.EURC;
               formatted = `€${balance.toFixed(2)}`;
            } else if (card.currency === 'PYUSD') {
               balance = stablecoinBalances.PYUSD;
               formatted = `$${balance.toFixed(2)}`;
            } else if (card.currency === 'USDT') {
               balance = 0; // Or from a state if we have it
               formatted = `$0.00`;
            }

            return {
              ...card,
              balanceUsd: formatted,
              balanceFormatted: formatted,
              accountName: displayAccountName,
              maskedWallet: displayMaskedWallet,
            };
          })}
          onDepositPress={() => setShowDepositModal(true)}
          onSendPress={() => router.push('/send')}
          onSwapActionPress={() => setShowSwapModal(true)}
          onCardChange={(card) => setActiveCardCurrency(card.currency)}
          onAddCardPress={() => setShowAddStablecoinModal(true)}
        />

        {/* ========================================================================= */}
        {/* 4. KHỐI THỐNG KÊ (Secondary Cards - 2 Cột Đầy Đặn, Padding 20, MinHeight 130) */}
        {/* ========================================================================= */}
        <View style={styles.statsRow}>
          {/* Card Trái (Expenses: Nền xanh lam nhạt #E0F7FA) */}
          <TouchableOpacity
            style={styles.statCardWrapper}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/overview');
            }}
            activeOpacity={0.88}
          >
            <View style={styles.statCardShadow} />
            <View style={[styles.statCardBody, { backgroundColor: '#E0F7FA' }]}>
              <View>
                <Text style={styles.statCardTitle}>Expenses</Text>
                <Text style={styles.statCardAmount}>
                  {calculateTotalExpenses()}
                </Text>
              </View>

              <View style={styles.expensesBottomRow}>
                <View style={styles.percentageBadgeRed}>
                  <Text style={styles.percentageBadgeText}>+ 27%</Text>
                </View>
                <Feather name="arrow-up-right" size={26} color="#000000" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Card Phải (Recent Transaction: Nền kem nhạt #FAF5EE) */}
          <TouchableOpacity
            style={styles.statCardWrapper}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/transfer-hub');
            }}
            activeOpacity={0.88}
          >
            <View style={styles.statCardShadow} />
            <View style={[styles.statCardBody, { backgroundColor: '#FAF5EE' }]}>
              <View>
                <Text style={styles.statCardTitle}>Recent Transaction</Text>
                <Text style={styles.statCardSubtitle}>Direct Bank</Text>
              </View>

              <View style={styles.recentBottomRow}>
                {/* Overlapping Avatars (A, D, H) */}
                <View style={styles.avatarGroupRow}>
                  <View style={[styles.avatarCircle, { backgroundColor: '#FECDD3', zIndex: 3 }]}>
                    <Text style={styles.avatarLetter}>A</Text>
                  </View>
                  <View style={[styles.avatarCircle, { backgroundColor: '#BAE6FD', marginLeft: -10, zIndex: 2 }]}>
                    <Text style={styles.avatarLetter}>D</Text>
                  </View>
                  <View style={[styles.avatarCircle, { backgroundColor: '#FEF08A', marginLeft: -10, zIndex: 1 }]}>
                    <Text style={styles.avatarLetter}>H</Text>
                  </View>
                </View>

                {/* Nút tròn màu tím chứa dấu + */}
                <View style={styles.plusBtnCircle}>
                  <Feather name="plus" size={19} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Banner Khôi phục ví khi thiết bị mới phát hiện (nếu có) */}
        {isNeedsRecovery && (
          <TouchableOpacity
            style={styles.recoveryCard}
            onPress={() => setShowRecoveryModal(true)}
            activeOpacity={0.88}
          >
            <View style={styles.recoveryIconCircle}>
              <MaterialCommunityIcons name="shield-key" size={24} color="#D97706" />
            </View>
            <View style={styles.recoveryTextCol}>
              <Text style={styles.recoveryTitle}>
                {t('home.newDeviceTitle', { defaultValue: 'Thiết bị mới phát hiện ⚠️' })}
              </Text>
              <Text style={styles.recoveryDesc}>
                {t('home.newDeviceDesc', { defaultValue: 'Cần khôi phục ví bảo mật để tiếp tục giao dịch.' })}
              </Text>
            </View>
            <View style={styles.recoveryBtn}>
              <Text style={styles.recoveryBtnText}>
                {t('home.recover', { defaultValue: 'Khôi phục' })}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODALS & POPUPS */}
      {/* ========================================================================= */}
      <DepositModal
        visible={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        solanaAddress={solanaAddress}
      />

      <SendModal
        visible={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        solanaAddress={solanaAddress}
        solBalance={solBalance}
        initialRecipient={withdrawAddress}
        onOpenScanner={handleOpenScanner}
        onConfirmSend={async (target, amt) => handleSendTransaction(target, amt)}
        isSending={isSendingTx}
        needsRecovery={isNeedsRecovery}
        onTriggerRecovery={() => {
          setShowWithdrawModal(false);
          setShowRecoveryModal(true);
        }}
      />

      <PhoneLinkingModal
        visible={showPhoneLinkingModal}
        onClose={() => setShowPhoneLinkingModal(false)}
        userId={user?.id || ''}
        walletAddress={solanaAddress || ''}
        onLinkSuccess={(phone) => setLinkedPhoneState(phone)}
      />

      <PhoneManagementModal
        visible={showPhoneManagementModal}
        onClose={() => setShowPhoneManagementModal(false)}
        userId={user?.id || ''}
        walletAddress={solanaAddress || ''}
        currentPhone={linkedPhoneState}
        onPhoneUpdated={(newPhone) => setLinkedPhoneState(newPhone)}
      />

      {showScanner && (
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={hasScanned ? undefined : handleBarCodeScanned}
          />
          <View style={styles.cameraOverlay}>
            <TouchableOpacity
              style={styles.cancelCameraBtn}
              onPress={() => setShowScanner(false)}
            >
              <Text style={styles.cancelCameraBtnText}>Hủy / Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <WalletRecoveryModal
        visible={showRecoveryModal || isNeedsRecovery}
        onClose={() => setShowRecoveryModal(false)}
        onSuccess={() => setShowRecoveryModal(false)}
      />

      {/* Modals cho Ví Stablecoin */}
      <AddStablecoinModal
        visible={showAddStablecoinModal}
        onClose={() => setShowAddStablecoinModal(false)}
        accountName={displayAccountName}
        maskedWallet={displayMaskedWallet}
        walletAddress={solanaAddress || ''}
      />

      <AddSubWalletModal
        visible={showAddSubWalletModal}
        onClose={() => setShowAddSubWalletModal(false)}
        existingWallets={subWallets}
        onSelectCurrency={(cur) => {
          addSubWallet(cur);
        }}
      />

      <NeoSwapModal
        visible={showSwapModal}
        onClose={() => {
          setShowSwapModal(false);
          setSelectedSubWalletForSwap(null);
        }}
        initialFromCurrency={activeCardCurrency}
        balances={stablecoinBalances}
        onConfirmSwap={handleConfirmSwap}
      />

      {/* Hệ thống Thông báo In-app Modal */}
      <NotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#EFE9DF', // Nền Kem sáng chuẩn Neo-brutalism (#EFE9DF)
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 110, // Chừa đệm tránh bị che bởi Floating Bottom Tab Bar
    gap: 20, // Khoảng cách liên kết chặt chẽ giữa các khối, loại bỏ cảm giác rời rạc
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFE9DF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#000000',
    fontWeight: '700',
  },

  // 1. Sticky Header Styles (Neo-brutalism, Rounded Corners & Time-based Dynamic)
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderWidth: 0,
    borderBottomWidth: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: 'transparent',
    borderBottomColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    gap: 12,
  },
  headerGreetingCol: {
    flex: 1,
    justifyContent: 'center',
  },
  headerGreetingTitle: {
    fontSize: 15.5,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerGreetingSubtitle: {
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 1,
    letterSpacing: -0.2,
  },
  profileBtnWrapper: {
    position: 'relative',
    width: 46,
    height: 46,
  },
  profileBtnShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000000',
  },
  profileBtnShadowNight: {
    backgroundColor: '#000000',
  },
  profileBtnBody: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileBtnBodyNight: {
    backgroundColor: '#25223D',
    borderColor: '#FFFFFF',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  bellBtnDay: {
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
    shadowColor: '#000000',
  },
  bellBtnNight: {
    backgroundColor: '#25223D',
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    shadowOffset: { width: 1, height: 1 },
    shadowColor: '#000000',
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  bellBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  qrCodeBtn: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },



  // 4. Secondary Statistic Cards Styles (Kéo giãn toàn bộ width: 100%, Padding 22, minHeight 180 để loại bỏ deadspace)
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
    marginBottom: 6,
  },
  statCardWrapper: {
    flex: 1,
    position: 'relative',
    minHeight: 180,
  },
  statCardShadow: {
    position: 'absolute',
    top: 4.5,
    left: 4.5,
    right: -4.5,
    bottom: -4.5,
    backgroundColor: '#000000',
    borderRadius: 24,
  },
  statCardBody: {
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: '#000000',
    paddingVertical: 22,
    paddingHorizontal: 18,
    justifyContent: 'space-between',
    minHeight: 180,
  },
  statCardTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.2,
  },
  statCardSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    marginTop: 4,
  },
  statCardAmount: {
    fontSize: 25,
    fontWeight: '900',
    color: '#000000',
    marginTop: 8,
    letterSpacing: -0.4,
  },
  expensesBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },
  percentageBadgeRed: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  percentageBadgeText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  recentBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },
  avatarGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  plusBtnCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#A855F7',
    borderWidth: 1.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 5. Recovery Card Styles
  recoveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    padding: 14,
    borderWidth: 2,
    borderColor: '#000000',
    width: '100%',
  },
  recoveryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDE68A',
    borderWidth: 1.5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  recoveryTextCol: {
    flex: 1,
    marginRight: 6,
  },
  recoveryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  recoveryDesc: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 14,
  },
  recoveryBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  recoveryBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },

  // 6. Camera Scanner Styles
  cameraContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#000000',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  cancelCameraBtn: {
    marginTop: 36,
    backgroundColor: '#EF4444',
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#000000',
  },
  cancelCameraBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
