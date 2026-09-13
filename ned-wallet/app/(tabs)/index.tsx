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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
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
import LoginScreen from '../login';

export default function HomeScreen() {
  const router = useRouter();
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

  // Quản lý Số dư Độc lập cho từng loại Stablecoin (USDC: $100, EURC: €0, PYUSD: $25)
  const [stablecoinBalances, setStablecoinBalances] = useState<StablecoinBalances>({
    USDC: 100.0,
    EURC: 0.0,
    PYUSD: 25.0,
  });
  const [activeCardCurrency, setActiveCardCurrency] = useState<string>('USDC');

  useEffect(() => {
    if (onchainUsdcBalance !== undefined && onchainUsdcBalance !== null && onchainUsdcBalance > 0) {
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
            if (isMounted) fetchActivities(solanaAddress, true);
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

  const displayGreetingName = username || getUserEmailPrefix() || 'Dat';
  const displayAccountName = username || 'Jon Snow';
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
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handlePullToRefresh}
            colors={['#000000']}
            tintColor="#000000"
          />
        }
      >
        {/* ========================================================================= */}
        {/* 1. HEADER (Profile Tròn Trái & QR Code Phải) */}
        {/* ========================================================================= */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.profileBtnWrapper}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings');
            }}
            activeOpacity={0.85}
          >
            <View style={styles.profileBtnShadow} />
            <View style={styles.profileBtnBody}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <Feather name="user" size={21} color="#000000" />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.qrCodeBtn}
            onPress={handleOpenScanner}
            activeOpacity={0.7}
          >
            <Ionicons name="qr-code-outline" size={28} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* ========================================================================= */}
        {/* 2. LỜI CHÀO (Hi Dat, Welcome Back !) */}
        {/* ========================================================================= */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingTitle}>
            {`Hi ${displayGreetingName},`}
          </Text>
          <Text style={styles.greetingWelcome}>
            {'Welcome Back !'}
          </Text>
          <Text style={styles.greetingSubtitle}>
            {"Here's your latest account overview"}
          </Text>
        </View>

        {/* ========================================================================= */}
        {/* 3. VÍ VẬT LÝ CHỨA THẺ STABLECOIN (Physical Wallet Card - Swap Button) */}
        {/* ========================================================================= */}
        <NeoPhysicalWalletCard
          cards={[
            {
              id: 'usdc',
              currency: 'USDC',
              name: 'US DOLLAR',
              symbol: '$',
              themeColor: '#00E5FF', // Xanh lam pastel/Cyan chuẩn Neo-brutalism
              badgeBg: '#FFFFFF',
              balanceUsd: `$${stablecoinBalances.USDC.toFixed(2)}`,
              balanceFormatted: `$${stablecoinBalances.USDC.toFixed(2)}`,
              accountName: displayAccountName,
              maskedWallet: displayMaskedWallet,
              rateInfo: '1 USDC = $1.00',
            },
            {
              id: 'eurc',
              currency: 'EURC',
              name: 'EURO',
              symbol: '€',
              themeColor: '#FFD6E8', // Hồng phấn pastel theo yêu cầu
              badgeBg: '#FFFFFF',
              balanceUsd: `$${(stablecoinBalances.EURC * 1.087).toFixed(2)}`,
              balanceFormatted: `€${stablecoinBalances.EURC.toFixed(2)}`,
              accountName: displayAccountName,
              maskedWallet: displayMaskedWallet,
              rateInfo: '1 EURC = €1.00',
            },
            {
              id: 'pyusd',
              currency: 'PYUSD',
              name: 'PAYPAL USD',
              symbol: '$',
              themeColor: '#FEF08A', // Vàng nhạt pastel ấm
              badgeBg: '#FFFFFF',
              balanceUsd: `$${stablecoinBalances.PYUSD.toFixed(2)}`,
              balanceFormatted: `$${stablecoinBalances.PYUSD.toFixed(2)}`,
              accountName: displayAccountName,
              maskedWallet: displayMaskedWallet,
              rateInfo: '1 PYUSD = $1.00',
            },
          ]}
          onDepositPress={() => setShowDepositModal(true)}
          onSendPress={() => router.push('/send')}
          onSwapActionPress={() => setShowSwapModal(true)}
          onCardChange={(card) => setActiveCardCurrency(card.currency)}
          onAddCardPress={() => setShowAddSubWalletModal(true)}
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
              router.push('/history');
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
    </SafeAreaView>
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

  // 1. Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileBtnWrapper: {
    position: 'relative',
    width: 46,
    height: 46,
  },
  profileBtnShadow: {
    position: 'absolute',
    top: 3.5,
    left: 3.5,
    width: 44,
    height: 44,
    borderRadius: 22,
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
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  qrCodeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 2. Greeting Section Styles
  greetingContainer: {
    marginTop: -4,
  },
  greetingTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: '#000000',
    lineHeight: 32,
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0, 0, 0, 0.12)',
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 0,
  },
  greetingWelcome: {
    fontSize: 27,
    fontWeight: '900',
    color: '#000000',
    lineHeight: 34,
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0, 0, 0, 0.12)',
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 0,
  },
  greetingSubtitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#555555',
    marginTop: 4,
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
