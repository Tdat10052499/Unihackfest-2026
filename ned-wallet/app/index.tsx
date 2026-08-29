import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Modal,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  usePrivy,
  useLoginWithEmail,
  useEmbeddedSolanaWallet,
} from '@privy-io/expo';
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import {
  getSolanaBalance,
  solanaConnection,
  fetchOnChainHistory,
  ActivityItem,
} from '../services/solana';
import {
  cacheBalance,
  getCachedBalance,
  cacheActivities,
  getCachedActivities,
} from '../services/storage';

export default function HomeScreen() {
  const { isReady, user, logout } = usePrivy();
  const { sendCode, loginWithCode, state: loginState } = useLoginWithEmail();
  const solanaWalletState = useEmbeddedSolanaWallet();
  const [permission, requestPermission] = useCameraPermissions();

  // State luồng đăng nhập
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'EMAIL_INPUT' | 'OTP_INPUT'>('EMAIL_INPUT');
  const [errorMessage, setErrorMessage] = useState('');
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);

  // State số dư & tiền tệ (USD / VND)
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'VND'>('USD');
  const [activeTab, setActiveTab] = useState<'home' | 'card' | 'send' | 'hub'>('home');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State Modals & Camera Scanner
  const [showScanner, setShowScanner] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDevnetDrawer, setShowDevnetDrawer] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const isScanningLocked = useRef(false);

  // State Withdraw Form
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('0.001');

  // State Devnet Test & Signature
  const [signatureResult, setSignatureResult] = useState('');
  const [isTestingSignature, setIsTestingSignature] = useState(false);

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
        const [cachedBal, cachedActs] = await Promise.all([
          getCachedBalance(),
          getCachedActivities(),
        ]);
        if (cachedBal !== null) {
          setSolBalance(cachedBal);
        }
        if (cachedActs !== null && cachedActs.length > 0) {
          setActivities(cachedActs);
        }
      } catch (err) {
        console.error('Error loading initial cached data:', err);
      }
    };

    loadCachedData();
  }, []);

  // 2. Luồng Cache-then-Network: Kéo dữ liệu on-chain chạy nền khi có địa chỉ ví
  useEffect(() => {
    if (solanaAddress) {
      fetchBalance(solanaAddress);
      fetchActivities(solanaAddress);
    }
  }, [solanaAddress]);

  // 3. WebSocket Listener: Lắng nghe sự kiện biến động số dư và tài khoản thời gian thực
  useEffect(() => {
    if (!solanaAddress) return;

    let subscriptionId: number | null = null;
    let debounceTimer: any = null;

    try {
      const pubKey = new PublicKey(solanaAddress);

      // Đăng ký lắng nghe sự kiện thay đổi của tài khoản từ Solana WebSocket RPC
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

          // Debounce gọi fetchActivities sau 2s để tránh spam RPC
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

    // Dọn dẹp bộ nhớ (Cleanup): Hủy đăng ký listener khi component unmount
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (subscriptionId !== null) {
        solanaConnection.removeAccountChangeListener(subscriptionId).catch((e) => {
          console.log('Error removing account change listener:', e);
        });
      }
    };
  }, [solanaAddress]);

  // Lấy số dư On-chain (Có kiểm tra thay đổi chống re-render thừa)
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
        // So sánh nội dung mới với state hiện tại để tránh re-render chớp nháy
        const currentList = activitiesRef.current;
        const isSame =
          currentList.length === onChainList.length &&
          currentList.every((item, idx) => item.id === onChainList[idx]?.id && item.amount === onChainList[idx]?.amount);

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
        fetchActivities(solanaAddress, true), // force refresh bỏ qua throttle
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

  // Xử lý sự kiện quét QR thành công (Chống lặp với ref synchronous lock)
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (isScanningLocked.current) return;
    isScanningLocked.current = true;
    setHasScanned(true);
    setShowScanner(false);
    console.log('Đã quét địa chỉ:', data);
    setWithdrawAddress(data);
    Alert.alert(
      'Quét Thành Công',
      `Đã nhận diện địa chỉ:\n${data}`,
      [
        { text: 'Đóng', style: 'cancel' },
        { text: 'Chuyển Tiền Ngay', onPress: () => setShowWithdrawModal(true) },
      ]
    );
  };

  // Khởi tạo ví Solana ngầm thủ công
  const handleCreateSolanaWallet = async () => {
    setIsCreatingWallet(true);
    setErrorMessage('');
    try {
      if (solanaWalletState?.create) {
        await solanaWalletState.create();
      }
    } catch (err: any) {
      console.log('Error creating Solana embedded wallet:', err);
      setErrorMessage(err?.message || 'Không thể khởi tạo ví ngầm Solana.');
    } finally {
      setIsCreatingWallet(false);
    }
  };

  // Ký và gửi giao dịch chuyển tiền On-chain lên Solana Devnet
  const handleSendTransaction = async (targetAddress?: string, amountSol?: number) => {
    if (!solanaAddress) return;
    const recipient = targetAddress || withdrawAddress.trim() || solanaAddress;
    const sendLamports = Math.floor((amountSol || parseFloat(withdrawAmount) || 0.001) * 1e9);

    setIsTestingSignature(true);
    setSignatureResult('');
    setErrorMessage('');

    try {
      if (!solanaWalletState?.wallets || solanaWalletState.wallets.length === 0) {
        throw new Error('Ví nhúng Solana chưa sẵn sàng.');
      }

      const provider = await solanaWalletState.wallets[0].getProvider();
      const fromPubkey = new PublicKey(solanaAddress);
      const toPubkey = new PublicKey(recipient);

      // 1. Lấy Blockhash mới nhất
      const { blockhash } = await solanaConnection.getLatestBlockhash('confirmed');

      // 2. Tạo Transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: sendLamports,
        })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      // 3. Ký giao dịch thông qua Privy Provider
      const { signedTransaction } = await provider.request({
        method: 'signTransaction',
        params: { transaction },
      });

      // 4. Broadcast lên Solana Devnet
      const rawBytes = signedTransaction.serialize();
      const txSignature = await solanaConnection.sendRawTransaction(rawBytes, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      if (txSignature) {
        setSignatureResult(txSignature);
        setShowWithdrawModal(false);

        // Optimistic UI: Cập nhật hoạt động mới vào danh sách & lưu cache tức thì
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

        // Tự động trừ số dư trên UI (Optimistic Balance)
        setSolBalance((prev) =>
          prev !== null ? Math.max(0, prev - sendLamports / 1e9 - 0.000005) : prev
        );

        Alert.alert('Giao Dịch Thành Công! ⚡', `Mã chữ ký (Signature):\n${txSignature.slice(0, 20)}...`);
      }
    } catch (err: any) {
      console.error('Solana Transaction Error:', err);
      Alert.alert('Lỗi Giao Dịch', err?.message || 'Không thể broadcast giao dịch lên Devnet.');
      setSignatureResult('Lỗi: ' + (err?.message || 'Giao dịch thất bại.'));
    } finally {
      setIsTestingSignature(false);
    }
  };

  // Sao chép chuỗi vào Clipboard
  const copyToClipboard = async (text?: string | null, msg: string = 'Đã sao chép vào bộ nhớ tạm!') => {
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Thông Báo', msg);
    } catch (err) {
      console.log('Copy error:', err);
    }
  };

  // Xử lý gửi OTP email
  const handleSendCode = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Vui lòng nhập địa chỉ email.');
      return;
    }
    setErrorMessage('');
    try {
      await sendCode({ email: trimmedEmail });
      setStep('OTP_INPUT');
    } catch (err: any) {
      console.log('Error sending OTP:', err);
      setErrorMessage(err?.message || 'Không thể gửi mã xác thực. Vui lòng thử lại.');
    }
  };

  // Xử lý xác thực mã OTP
  const handleVerifyCode = async () => {
    const trimmedCode = otpCode.trim();
    const trimmedEmail = email.trim();
    if (!trimmedCode) {
      setErrorMessage('Vui lòng nhập mã OTP.');
      return;
    }
    setErrorMessage('');
    try {
      await loginWithCode({ code: trimmedCode, email: trimmedEmail });
    } catch (err: any) {
      console.log('Error verifying OTP:', err);
      setErrorMessage(err?.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn.');
    }
  };

  // Tính toán hiển thị số dư định dạng theo tiền tệ
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

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00A859" />
        <Text style={styles.loadingText}>Đang khởi tạo ví N.E.D...</Text>
      </View>
    );
  }

  // Giao diện Đăng nhập Email nếu chưa xác thực
  if (!user) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <View style={styles.authCard}>
          <View style={styles.authLogoContainer}>
            <View style={styles.authLogoCircle}>
              <Text style={styles.authLogoText}>Đ</Text>
            </View>
          </View>
          <Text style={styles.authTitle}>NorthAxis E-Wallet</Text>
          <Text style={styles.authSubtitle}>Thanh toán vi mô Solana Pay / MiniPay</Text>

          {step === 'EMAIL_INPUT' ? (
            <View style={{ width: '100%', marginTop: 20 }}>
              <Text style={styles.inputLabel}>Email của bạn</Text>
              <TextInput
                style={styles.authInput}
                placeholder="vidu@domain.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errorMessage) setErrorMessage('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.mainGreenBtn, loginState.status === 'sending-code' && { opacity: 0.7 }]}
                onPress={handleSendCode}
                disabled={loginState.status === 'sending-code' || !email.trim()}
              >
                {loginState.status === 'sending-code' ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.mainGreenBtnText}>Tiếp tục</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: '100%', marginTop: 20 }}>
              <Text style={styles.inputLabel}>Mã xác thực OTP</Text>
              <Text style={styles.otpSentText}>
                Đã gửi mã đến: <Text style={{ fontWeight: 'bold' }}>{email}</Text>
              </Text>
              <TextInput
                style={styles.authInput}
                placeholder="Nhập 6 chữ số OTP"
                placeholderTextColor="#9CA3AF"
                value={otpCode}
                onChangeText={(t) => {
                  setOtpCode(t);
                  if (errorMessage) setErrorMessage('');
                }}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={[styles.mainGreenBtn, loginState.status === 'submitting-code' && { opacity: 0.7 }]}
                onPress={handleVerifyCode}
                disabled={loginState.status === 'submitting-code' || !otpCode.trim()}
              >
                {loginState.status === 'submitting-code' ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.mainGreenBtnText}>Xác thực & Đăng nhập</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => {
                  setStep('EMAIL_INPUT');
                  setOtpCode('');
                }}
              >
                <Text style={styles.backBtnText}>Quay lại nhập email</Text>
              </TouchableOpacity>
            </View>
          )}

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  // Giao diện Chính Home Screen theo phong cách MiniPay
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
          {/* Badge Chào Mừng Bên Trái */}
          <View style={styles.welcomeBadge}>
            <View style={styles.welcomeLogoCircle}>
              <Text style={styles.welcomeLogoText}>Đ</Text>
            </View>
            <Text style={styles.welcomeText}>Welcome to N.E.D! 👋</Text>
          </View>

          {/* Nút Quét QR Code Scanner Bên Phải */}
          <TouchableOpacity
            style={styles.qrScannerIconBtn}
            onPress={handleOpenScanner}
            activeOpacity={0.7}
          >
            <Ionicons name="qr-code-outline" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* 2. Balance Card Component (Màu xanh lá MiniPay) */}
        <View style={styles.balanceCardWrapper}>
          <View style={styles.balanceCard}>
            {/* Top Bar bên trong Card */}
            <View style={styles.cardTopRow}>
              <Text style={styles.currencyLabel}>
                {currency === 'USD' ? 'Dollars' : 'Vietnam Dong'}
              </Text>

              {/* Currency Toggle USD / VND */}
              <View style={styles.toggleContainer}>
                <Text
                  style={[
                    styles.toggleOptionText,
                    currency === 'USD' ? styles.toggleOptionActive : styles.toggleOptionInactive,
                  ]}
                >
                  USD
                </Text>
                <TouchableOpacity
                  style={[
                    styles.customSwitch,
                    currency === 'VND' ? styles.customSwitchActive : styles.customSwitchInactive,
                  ]}
                  onPress={() => setCurrency(currency === 'USD' ? 'VND' : 'USD')}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.switchThumb,
                      currency === 'VND' ? styles.switchThumbRight : styles.switchThumbLeft,
                    ]}
                  />
                </TouchableOpacity>
                <Text
                  style={[
                    styles.toggleOptionText,
                    currency === 'VND' ? styles.toggleOptionActive : styles.toggleOptionInactive,
                  ]}
                >
                  VND
                </Text>
              </View>
            </View>

            {/* Số dư Lớn Nổi Bật Trung Tâm */}
            <View style={styles.balanceDisplayRow}>
              <Text style={styles.mainBalanceText}>{getFormattedBalance()}</Text>
            </View>

            {/* Hai Nút Hành Động: Deposit & Withdraw */}
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

          {/* Nút Chevron Mở Rộng Tiện Ích On-chain ở Viền Dưới */}
          <TouchableOpacity
            style={styles.chevronPillBtn}
            onPress={() => setShowDevnetDrawer(!showDevnetDrawer)}
            activeOpacity={0.8}
          >
            <Feather
              name={showDevnetDrawer ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#059669"
            />
          </TouchableOpacity>
        </View>

        {/* Ngăn Tiện Ích Mở Rộng (Devnet / Solana Tools) */}
        {showDevnetDrawer && (
          <View style={styles.devnetDrawerCard}>
            <View style={styles.devnetHeaderRow}>
              <Text style={styles.devnetTitle}>⚡ Solana Devnet Tools</Text>
              <TouchableOpacity
                style={styles.logoutTextBtn}
                onPress={() => {
                  logout();
                  setStep('EMAIL_INPUT');
                }}
              >
                <Text style={styles.logoutText}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>

            {solanaAddress ? (
              <View style={styles.addressBox}>
                <Text style={styles.addressBoxLabel}>Ví Solana Base58:</Text>
                <Text style={styles.addressBoxValue} numberOfLines={1} ellipsizeMode="middle">
                  {solanaAddress}
                </Text>
                <TouchableOpacity
                  style={styles.copyTinyBtn}
                  onPress={() => copyToClipboard(solanaAddress, 'Đã sao chép địa chỉ ví Solana!')}
                >
                  <Text style={styles.copyTinyBtnText}>Sao chép</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.createWalletBtn}
                onPress={handleCreateSolanaWallet}
                disabled={isCreatingWallet}
              >
                <Text style={styles.createWalletBtnText}>
                  {isCreatingWallet ? 'Đang tạo ví...' : 'Khởi tạo ví Solana ngầm'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ marginTop: 10 }}>
              <TouchableOpacity
                style={styles.testTxBtn}
                onPress={() => handleSendTransaction(solanaAddress || undefined, 0.0001)}
                disabled={isTestingSignature}
              >
                {isTestingSignature ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.testTxBtnText}>⚡ Ký & Gửi Giao Dịch Thử (0.0001 SOL)</Text>
                )}
              </TouchableOpacity>
            </View>

            {signatureResult ? (
              <View style={styles.signatureBox}>
                <Text style={styles.signatureBoxLabel}>Tx Signature:</Text>
                <Text style={styles.signatureBoxValue} numberOfLines={2}>
                  {signatureResult}
                </Text>
                <TouchableOpacity
                  style={styles.copyTinyBtn}
                  onPress={() => copyToClipboard(signatureResult, 'Đã sao chép Transaction Signature!')}
                >
                  <Text style={styles.copyTinyBtnText}>Sao chép Signature</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}

        {/* 3. Next Steps (Onboarding Component) */}
        <View style={styles.nextStepsCard}>
          <View style={styles.nextStepsHeader}>
            <Text style={styles.nextStepsTitle}>Next steps</Text>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1 of 2</Text>
            </View>
          </View>

          {/* Progress Bar 50% */}
          <View style={styles.progressBarTrack}>
            <View style={styles.progressBarFill} />
          </View>

          {/* Danh sách Nhiệm vụ */}
          <View style={styles.taskItemRow}>
            <View style={styles.taskIconSuccess}>
              <Ionicons name="checkmark-sharp" size={14} color="#FFFFFF" />
            </View>
            <View style={styles.taskTextCol}>
              <Text style={styles.taskTitleCompleted}>Connect phone number</Text>
              <Text style={styles.taskSubCompleted}>Receive from anyone</Text>
            </View>
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

        {/* 4. Recent Activity Component (Khớp nối State & Anti-Flicker) */}
        <View style={styles.activityCard}>
          <View style={styles.activityHeaderRow}>
            <Text style={styles.activityTitle}>Recent activity</Text>
            <TouchableOpacity
              style={styles.viewMorePillBtn}
              onPress={() => solanaAddress && fetchActivities(solanaAddress, true)}
            >
              {isLoadingActivities ? (
                <ActivityIndicator size="small" color="#00A859" />
              ) : (
                <Text style={styles.viewMoreText}>View more</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Danh sách Giao dịch */}
          {activities.length === 0 ? (
            <View style={styles.emptyActivityBox}>
              <Ionicons name="receipt-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyActivityText}>Chưa có giao dịch gần đây</Text>
            </View>
          ) : (
            <View style={styles.activityList}>
              {activities.map((item) => (
                <View key={item.id} style={styles.activityItem}>
                  <View style={[styles.activityIconCircle, { backgroundColor: item.iconBg }]}>
                    {item.type === 'reward' ? (
                      <MaterialCommunityIcons name="gift-outline" size={20} color="#FFFFFF" />
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
                      item.isPositive ? styles.amountPositive : styles.amountNegative,
                    ]}
                  >
                    {item.amount}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Khoảng trống đệm cuộn phía dưới */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* 5. Bottom Navigation Bar */}
      <View style={styles.bottomNavBar}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('home')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="home"
            size={24}
            color={activeTab === 'home' ? '#00A859' : '#9CA3AF'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('card')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="card-outline"
            size={24}
            color={activeTab === 'card' ? '#00A859' : '#9CA3AF'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setActiveTab('send');
            setShowWithdrawModal(true);
          }}
          activeOpacity={0.7}
        >
          <Feather
            name="send"
            size={22}
            color={activeTab === 'send' ? '#00A859' : '#9CA3AF'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setActiveTab('hub');
            Alert.alert('N.E.D MiniApp Hub', 'Trung tâm ứng dụng MiniApp Web3 sẽ sớm ra mắt! 🚀');
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name="grid-outline"
            size={22}
            color={activeTab === 'hub' ? '#00A859' : '#9CA3AF'}
          />
        </TouchableOpacity>
      </View>

      {/* Modal Nhận Tiền (Deposit / My QR) */}
      <Modal visible={showDepositModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Nhận Tiền (Deposit)</Text>
              <TouchableOpacity onPress={() => setShowDepositModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Quét mã QR để nhận thanh toán Solana Pay</Text>

            {solanaAddress ? (
              <View style={styles.qrContainer}>
                <QRCode
                  value={solanaAddress}
                  size={190}
                  color="#111827"
                  backgroundColor="#FFFFFF"
                />
                <Text style={styles.qrAddressText} numberOfLines={2}>
                  {solanaAddress}
                </Text>
              </View>
            ) : (
              <Text style={{ marginVertical: 20, color: '#6B7280' }}>
                Chưa phát hiện địa chỉ ví Solana.
              </Text>
            )}

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => solanaAddress && copyToClipboard(solanaAddress, 'Đã sao chép địa chỉ ví!')}
            >
              <Text style={styles.modalPrimaryBtnText}>Sao chép Địa chỉ Ví</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Rút / Chuyển Tiền (Withdraw) */}
      <Modal visible={showWithdrawModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Rút Tiền (Withdraw)</Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Chuyển SOL trên mạng lưới Solana Devnet</Text>

            <View style={{ width: '100%', marginTop: 12 }}>
              <Text style={styles.inputLabel}>Địa chỉ ví nhận:</Text>
              <View style={styles.inputWithAction}>
                <TextInput
                  style={styles.flexInput}
                  placeholder="Nhập địa chỉ Solana Base58"
                  placeholderTextColor="#9CA3AF"
                  value={withdrawAddress}
                  onChangeText={setWithdrawAddress}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={handleOpenScanner} style={styles.scanTinyBtn}>
                  <Ionicons name="qr-code-outline" size={20} color="#00A859" />
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Số lượng (SOL):</Text>
              <TextInput
                style={styles.authInput}
                placeholder="0.001"
                placeholderTextColor="#9CA3AF"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[styles.modalPrimaryBtn, { marginTop: 16 }]}
                onPress={() => handleSendTransaction()}
                disabled={isTestingSignature || !withdrawAddress.trim()}
              >
                {isTestingSignature ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalPrimaryBtnText}>Xác nhận Chuyển tiền</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Camera Scanner */}
      <Modal visible={showScanner} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={hasScanned ? undefined : handleBarCodeScanned}
          />
          {/* Overlay render song song với CameraView */}
          <View style={styles.cameraOverlay}>
            <View style={styles.scanBoundingBox} />
            <Text style={styles.scanHintText}>Hướng camera vào mã QR thanh toán</Text>
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

  // 1. Header Styles
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

  // 2. Balance Card Styles (Emerald Green MiniPay)
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
  chevronPillBtn: {
    marginTop: -14,
    width: 38,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1F4E0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },

  // Devnet Drawer
  devnetDrawerCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  devnetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  devnetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  logoutTextBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  logoutText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  addressBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressBoxLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  addressBoxValue: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#0F172A',
    fontWeight: '600',
  },
  copyTinyBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#D1F4E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  copyTinyBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  createWalletBtn: {
    backgroundColor: '#00A859',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  createWalletBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  testTxBtn: {
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  testTxBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  signatureBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  signatureBoxLabel: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '700',
  },
  signatureBoxValue: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#78350F',
    marginTop: 2,
  },

  // 3. Next Steps (Onboarding)
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

  // 4. Recent Activity
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
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 70,
    alignItems: 'center',
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

  // 5. Bottom Navigation Bar
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: Platform.OS === 'ios' ? 12 : 4,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },

  // Modals Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
  },
  modalHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginVertical: 10,
  },
  qrAddressText: {
    marginTop: 12,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  modalPrimaryBtn: {
    width: '100%',
    backgroundColor: '#00A859',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  inputWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  flexInput: {
    flex: 1,
    height: 44,
    fontSize: 13,
    color: '#111827',
  },
  scanTinyBtn: {
    padding: 6,
  },

  // Auth Styles
  authContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 26,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  authLogoContainer: {
    marginBottom: 14,
  },
  authLogoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00A859',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authLogoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  authTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  authSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  authInput: {
    width: '100%',
    height: 48,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    marginBottom: 14,
  },
  otpSentText: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 10,
  },
  mainGreenBtn: {
    width: '100%',
    backgroundColor: '#00A859',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  mainGreenBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  backBtn: {
    marginTop: 12,
    alignItems: 'center',
  },
  backBtnText: {
    color: '#6B7280',
    fontSize: 13,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },

  // Camera Overlay
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
