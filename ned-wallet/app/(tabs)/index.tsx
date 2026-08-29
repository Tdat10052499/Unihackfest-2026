import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  usePrivy,
  useEmbeddedSolanaWallet,
} from '@privy-io/expo';
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import {
  getSolanaBalance,
  solanaConnection,
  fetchOnChainHistory,
  ActivityItem,
  formatRelativeTime,
} from '@/services/solana';
import {
  cacheBalance,
  getCachedBalance,
  cacheActivities,
  getCachedActivities,
  getHasSkippedPhoneLink,
  getLinkedPhone,
} from '@/services/storage';
import { DepositModal } from '@/components/DepositModal';
import { SendModal } from '@/components/SendModal';
import { PhoneLinkingModal } from '@/components/PhoneLinkingModal';
import { PhoneManagementModal } from '@/components/PhoneManagementModal';
import LoginScreen from '../login';

export default function HomeScreen() {
  const router = useRouter();
  
  let privy: any = null;
  try {
    privy = usePrivy();
  } catch (e) {
    // safely ignore
  }
  const isReady = privy?.isReady ?? false;
  const user = privy?.user ?? null;

  let solanaWalletState: any = null;
  try {
    solanaWalletState = useEmbeddedSolanaWallet();
  } catch (e) {
    // safely ignore
  }

  const [permission, requestPermission] = useCameraPermissions();

  // State số dư & tiền tệ (USD / VND)
  const [solBalance, setSolBalance] = useState<number | null>(null);
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

  // State danh sách lịch sử giao dịch & loading
  const [activities, setActivities] = useState<ActivityItem[]>([
    {
      id: '1',
      type: 'reward',
      title: 'Reward',
      time: '4 mo ago',
      amount: '+$<0,01',
      isPositive: true,
      iconBg: '#3B82F6',
    },
    {
      id: '2',
      type: 'received',
      title: 'Received',
      time: '4 mo ago',
      amount: '+$0,10',
      isPositive: true,
      iconBg: '#DDD6FE',
    },
  ]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Ref theo dõi activities hiện tại để so sánh chống chớp màn hình (Anti-flicker)
  const activitiesRef = useRef<ActivityItem[]>(activities);
  useEffect(() => {
    activitiesRef.current = activities;
  }, [activities]);

  // Trích xuất địa chỉ ví Solana dạng Base58
  const getSolanaWalletAddress = (): string | null => {
    if (!user) return null;

    if (solanaWalletState?.wallets && solanaWalletState.wallets.length > 0) {
      const solWallet = solanaWalletState.wallets[0];
      if (solWallet?.address) return solWallet.address;
      if (solWallet?.publicKey) return solWallet.publicKey;
    }

    const linkedAccounts =
      (user as any)?.linked_accounts || (user as any)?.linkedAccounts || [];

    const solanaAccount = linkedAccounts.find(
      (acc: any) =>
        acc.type === 'wallet' &&
        (acc.chain_type === 'solana' || acc.chainType === 'solana')
    );
    if (solanaAccount?.address) {
      return solanaAccount.address;
    }

    if ((user as any)?.wallet?.address) {
      const addr = (user as any).wallet.address;
      if (!addr.startsWith('0x') || (user as any).wallet.chainType === 'solana') {
        return addr;
      }
    }

    return null;
  };

  const solanaAddress = getSolanaWalletAddress();

  // 1. Luồng Cache-then-Network: Nạp Cache khởi tạo ngay lập tức
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

  // 2. Kiểm tra trạng thái liên kết SĐT (Phone Linking Prompt)
  useEffect(() => {
    const checkPhoneLinkingPrompt = async () => {
      if (!user) return;
      try {
        const [skipped, linked] = await Promise.all([
          getHasSkippedPhoneLink(),
          getLinkedPhone(),
        ]);
        if (linked) {
          setLinkedPhoneState(linked);
        }
        if (!linked && !skipped) {
          setTimeout(() => {
            setShowPhoneLinkingModal(true);
          }, 800);
        }
      } catch (err) {
        console.error('Error checking phone link prompt:', err);
      }
    };

    checkPhoneLinkingPrompt();
  }, [user]);

  // 3. Luồng Cache-then-Network: Kéo dữ liệu on-chain chạy nền khi có địa chỉ ví
  useEffect(() => {
    if (solanaAddress) {
      fetchBalance(solanaAddress);
      fetchActivities(solanaAddress);
    }
  }, [solanaAddress]);

  // 4. WebSocket Listener: Lắng nghe sự kiện biến động số dư và tài khoản thời gian thực
  useEffect(() => {
    if (!solanaAddress) return;

    let subscriptionId: number | null = null;
    let debounceTimer: any = null;

    try {
      const pubKey = new PublicKey(solanaAddress);

      subscriptionId = solanaConnection.onAccountChange(
        pubKey,
        (accountInfo) => {
          const newBalance = accountInfo.lamports / LAMPORTS_PER_SOL;
          console.log('⚡ [WebSocket] Biến động số dư tài khoản thời gian thực:', newBalance, 'SOL');

          setSolBalance((prev) => {
            if (prev !== newBalance) {
              cacheBalance(newBalance);
              return newBalance;
            }
            return prev;
          });

          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchActivities(solanaAddress);
          }, 2000);
        },
        'confirmed'
      );
    } catch (err) {
      console.error('Error setting up onAccountChange WebSocket listener:', err);
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (subscriptionId !== null) {
        solanaConnection.removeAccountChangeListener(subscriptionId).catch((e) => {
          console.log('Error removing account change listener:', e);
        });
      }
    };
  }, [solanaAddress]);

  // Lấy số dư On-chain
  const fetchBalance = async (address: string) => {
    try {
      const balance = await getSolanaBalance(address);
      setSolBalance((prev) => {
        if (prev !== balance) {
          cacheBalance(balance);
          return balance;
        }
        return prev;
      });
    } catch (err: any) {
      console.log('Error fetching Devnet balance:', err);
    }
  };

  // Lấy lịch sử giao dịch On-chain (Tối ưu Anti-Flicker)
  const fetchActivities = async (address: string, force: boolean = false) => {
    setIsLoadingActivities(true);
    try {
      const onChainList = await fetchOnChainHistory(address, force);
      if (onChainList && onChainList.length > 0) {
        const currentList = activitiesRef.current;
        const isSame =
          currentList.length === onChainList.length &&
          currentList.every(
            (item, idx) =>
              item.id === onChainList[idx]?.id &&
              item.amount === onChainList[idx]?.amount
          );

        if (!isSame) {
          setActivities(onChainList);
          cacheActivities(onChainList);
        }
      }
    } catch (err: any) {
      console.log('Error fetching on-chain history:', err);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  // Hàm xử lý Vuốt để làm mới (Pull-to-Refresh)
  const handlePullToRefresh = useCallback(async () => {
    if (!solanaAddress) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchBalance(solanaAddress),
        fetchActivities(solanaAddress, true),
      ]);
    } catch (err) {
      console.log('Error refreshing data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [solanaAddress]);

  // Mở màn hình Camera quét mã QR
  const handleOpenScanner = async () => {
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

  // Xử lý sự kiện quét QR thành công
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (isScanningLocked.current) return;
    isScanningLocked.current = true;
    setHasScanned(true);
    setShowScanner(false);
    console.log('Đã quét địa chỉ:', data);
    setWithdrawAddress(data);
    setShowWithdrawModal(true);
  };

  // Ký và gửi giao dịch chuyển tiền On-chain lên Solana Devnet
  const handleSendTransaction = async (
    targetAddress?: string,
    amountSol?: number
  ) => {
    if (!solanaAddress) return;
    const recipient = targetAddress || withdrawAddress.trim() || solanaAddress;
    const sendLamports = Math.floor((amountSol || 0.001) * 1e9);

    setIsSendingTx(true);

    try {
      if (!solanaWalletState?.wallets || solanaWalletState.wallets.length === 0) {
        throw new Error('Ví nhúng Solana chưa sẵn sàng.');
      }

      const provider = await solanaWalletState.wallets[0].getProvider();
      const fromPubkey = new PublicKey(solanaAddress);
      const toPubkey = new PublicKey(recipient);

      const { blockhash } = await solanaConnection.getLatestBlockhash('confirmed');

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

      const rawBytes = signedTransaction.serialize();
      const txSignature = await solanaConnection.sendRawTransaction(rawBytes, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      if (txSignature) {
        setShowWithdrawModal(false);

        const newAct: ActivityItem = {
          id: txSignature,
          type: 'sent',
          title: 'Chuyển tiền',
          time: 'Vừa xong',
          amount: `-${((sendLamports / 1e9) * 150).toFixed(2).replace('.', ',')}$`,
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
          prev !== null ? Math.max(0, prev - sendLamports / 1e9 - 0.000005) : prev
        );

        Alert.alert(
          'Giao Dịch Thành Công! ⚡',
          `Mã chữ ký (Signature):\n${txSignature.slice(0, 20)}...`
        );
      }
    } catch (err: any) {
      console.error('Solana Transaction Error:', err);
      Alert.alert(
        'Lỗi Giao Dịch',
        err?.message || 'Không thể broadcast giao dịch lên Devnet.'
      );
    } finally {
      setIsSendingTx(false);
    }
  };

  const getFormattedBalance = () => {
    if (solBalance === null) return currency === 'USD' ? '$0,10' : '2.540 ₫';
    const usdVal = solBalance * 150 + 0.1;
    if (currency === 'USD') {
      return `$${usdVal.toFixed(2).replace('.', ',')}`;
    } else {
      const vndVal = usdVal * 25400;
      return `${Math.round(vndVal).toLocaleString('vi-VN')} ₫`;
    }
  };

  const getMaskedPhone = (rawPhone: string | null): string => {
    if (!rawPhone) return 'Chưa liên kết';
    const cleaned = rawPhone.trim();
    if (cleaned.length < 8) return cleaned;
    const prefix = cleaned.slice(0, 5);
    const suffix = cleaned.slice(-2);
    const middleCount = Math.max(3, cleaned.length - 7);
    const masked = 'x'.repeat(middleCount);
    return `${prefix} ${masked} ${suffix}`;
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00A859" />
        <Text style={styles.loadingText}>Đang khởi tạo ví N.E.D...</Text>
      </View>
    );
  }

  if (!user) {
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
            colors={['#00A859']}
            tintColor="#00A859"
          />
        }
      >
        {/* 1. Header Component */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.welcomeBadge}
            onPress={() => router.push('/settings')}
            activeOpacity={0.8}
          >
            <View style={styles.welcomeLogoCircle}>
              <Text style={styles.welcomeLogoText}>Đ</Text>
            </View>
            <Text style={styles.welcomeText}>Welcome to N.E.D! 👋</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.qrScannerIconBtn}
            onPress={handleOpenScanner}
            activeOpacity={0.7}
          >
            <Ionicons name="qr-code-outline" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* 2. Balance Card Component */}
        <View style={styles.balanceCardWrapper}>
          <View style={styles.balanceCard}>
            <View style={styles.cardTopRow}>
              <Text style={styles.currencyLabel}>
                {currency === 'USD' ? 'Dollars' : 'Vietnam Dong'}
              </Text>

              <View style={styles.toggleContainer}>
                <Text
                  style={[
                    styles.toggleOptionText,
                    currency === 'USD'
                      ? styles.toggleOptionActive
                      : styles.toggleOptionInactive,
                  ]}
                >
                  USD
                </Text>
                <TouchableOpacity
                  style={[
                    styles.customSwitch,
                    currency === 'VND'
                      ? styles.customSwitchActive
                      : styles.customSwitchInactive,
                  ]}
                  onPress={() =>
                    setCurrency(currency === 'USD' ? 'VND' : 'USD')
                  }
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.switchThumb,
                      currency === 'VND'
                        ? styles.switchThumbRight
                        : styles.switchThumbLeft,
                    ]}
                  />
                </TouchableOpacity>
                <Text
                  style={[
                    styles.toggleOptionText,
                    currency === 'VND'
                      ? styles.toggleOptionActive
                      : styles.toggleOptionInactive,
                  ]}
                >
                  VND
                </Text>
              </View>
            </View>

            <View style={styles.balanceDisplayRow}>
              <Text style={styles.mainBalanceText}>{getFormattedBalance()}</Text>
            </View>

            <View style={styles.cardActionsRow}>
              <TouchableOpacity
                style={styles.cardActionBtn}
                onPress={() => setShowDepositModal(true)}
                activeOpacity={0.85}
              >
                <View style={styles.actionIconCircle}>
                  <Feather name="arrow-down" size={16} color="#00A859" />
                </View>
                <Text style={styles.cardActionBtnText}>Deposit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cardActionBtn}
                onPress={() => setShowWithdrawModal(true)}
                activeOpacity={0.85}
              >
                <View style={styles.actionIconCircle}>
                  <Feather name="arrow-up-right" size={16} color="#00A859" />
                </View>
                <Text style={styles.cardActionBtnText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 3. Next Steps (Onboarding Component) */}
        <View style={styles.nextStepsCard}>
          <View style={styles.nextStepsHeader}>
            <Text style={styles.nextStepsTitle}>Next steps</Text>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1 of 2</Text>
            </View>
          </View>

          <View style={styles.progressBarTrack}>
            <View style={styles.progressBarFill} />
          </View>

          <View style={styles.taskItemRow}>
            <View style={styles.taskIconSuccess}>
              <Ionicons name="checkmark-sharp" size={14} color="#FFFFFF" />
            </View>
            <TouchableOpacity
              style={styles.taskTextCol}
              onPress={() => {
                if (linkedPhoneState) {
                  setShowPhoneManagementModal(true);
                } else {
                  setShowPhoneLinkingModal(true);
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.taskTitleCompleted}>
                Connect Account
              </Text>
              <Text style={styles.taskSubCompleted}>
                {linkedPhoneState
                  ? `Linked: ${getMaskedPhone(linkedPhoneState)} (Chạm để quản lý)`
                  : 'Signed in securely (Chạm để thêm SĐT)'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.taskItemRow, { marginTop: 14 }]}>
            <View style={styles.taskIconPending} />
            <View style={styles.taskTextCol}>
              <Text style={styles.taskTitlePending}>Make a deposit</Text>
              <Text style={styles.taskSubPending}>Then you're ready</Text>
            </View>
            <TouchableOpacity
              style={styles.depositDarkActionBtn}
              onPress={() => setShowDepositModal(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.depositDarkActionBtnText}>Deposit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Recent Activity Component (Tối đa 4 hoạt động & Điều hướng sang History) */}
        <View style={styles.activityCard}>
          <View style={styles.activityHeaderRow}>
            <Text style={styles.activityTitle}>Recent activity</Text>
            <TouchableOpacity
              style={styles.viewMorePillBtn}
              onPress={() => router.push('/history')}
              activeOpacity={0.75}
            >
              <Text style={styles.viewMoreText}>View more</Text>
              <Feather name="chevron-right" size={12} color="#374151" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>

          {activities.length === 0 ? (
            <View style={styles.emptyActivityBox}>
              <Ionicons name="receipt-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyActivityText}>
                Chưa có giao dịch gần đây
              </Text>
            </View>
          ) : (
            <View style={styles.activityList}>
              {activities.slice(0, 4).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.activityItem}
                  onPress={() => router.push('/history')}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.activityIconCircle,
                      { backgroundColor: item.iconBg },
                    ]}
                  >
                    {item.type === 'reward' ? (
                      <MaterialCommunityIcons
                        name="gift-outline"
                        size={20}
                        color="#FFFFFF"
                      />
                    ) : item.type === 'received' ? (
                      <Ionicons name="arrow-down" size={18} color="#FFFFFF" />
                    ) : (
                      <Feather name="arrow-up-right" size={18} color="#FFFFFF" />
                    )}
                  </View>
                  <View style={styles.activityDetailCol}>
                    <Text style={styles.activityItemTitle}>{item.title}</Text>
                    <Text style={styles.activityItemTime}>{item.time}</Text>
                  </View>
                  <Text
                    style={[
                      styles.activityItemAmount,
                      item.isPositive
                        ? styles.amountPositive
                        : styles.amountNegative,
                    ]}
                  >
                    {item.amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Modals */}
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

      <Modal visible={showScanner} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={hasScanned ? undefined : handleBarCodeScanned}
          />
          <View style={styles.cameraOverlay}>
            <View style={styles.scanBoundingBox} />
            <Text style={styles.scanHintText}>
              Hướng camera vào mã QR thanh toán
            </Text>
            <TouchableOpacity
              style={styles.cancelCameraBtn}
              onPress={() => setShowScanner(false)}
            >
              <Text style={styles.cancelCameraBtnText}>Hủy / Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1F4E0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 24,
  },
  welcomeLogoCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#00A859',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  welcomeLogoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  welcomeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#064E3B',
  },
  qrScannerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  balanceCardWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceCard: {
    width: '100%',
    backgroundColor: '#00A859',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currencyLabel: {
    color: '#D1FAE5',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleOptionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  toggleOptionActive: {
    color: '#FFFFFF',
  },
  toggleOptionInactive: {
    color: '#A7F3D0',
  },
  customSwitch: {
    width: 38,
    height: 22,
    borderRadius: 12,
    backgroundColor: '#00753E',
    padding: 2,
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  customSwitchActive: {
    backgroundColor: '#006133',
  },
  customSwitchInactive: {
    backgroundColor: '#00753E',
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  switchThumbLeft: {
    alignSelf: 'flex-start',
  },
  switchThumbRight: {
    alignSelf: 'flex-end',
  },
  balanceDisplayRow: {
    marginVertical: 14,
  },
  mainBalanceText: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  actionIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  nextStepsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  nextStepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextStepsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  stepBadge: {
    backgroundColor: '#D1F4E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    marginVertical: 14,
    overflow: 'hidden',
  },
  progressBarFill: {
    width: '50%',
    height: '100%',
    backgroundColor: '#00A859',
    borderRadius: 2,
  },
  taskItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIconSuccess: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#00A859',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskIconPending: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#00A859',
    marginRight: 12,
  },
  taskTextCol: {
    flex: 1,
  },
  taskTitleCompleted: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  taskSubCompleted: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  taskTitlePending: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  taskSubPending: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  depositDarkActionBtn: {
    backgroundColor: '#1E1E2E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  depositDarkActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  viewMorePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewMoreText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  activityList: {
    gap: 16,
  },
  emptyActivityBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyActivityText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityDetailCol: {
    flex: 1,
  },
  activityItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  activityItemTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  activityItemAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  amountPositive: {
    color: '#00A859',
  },
  amountNegative: {
    color: '#111827',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  scanBoundingBox: {
    width: 250,
    height: 250,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#00A859',
    backgroundColor: 'transparent',
  },
  scanHintText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 24,
  },
  cancelCameraBtn: {
    marginTop: 36,
    backgroundColor: '#EF4444',
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 24,
  },
  cancelCameraBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
