import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import {
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import { lookupWalletByPhone } from '../services/supabase';
import { getSolanaBalance, ActivityItem } from '../services/solana';
import { cacheActivities, getCachedActivities } from '../services/storage';
import { useOnchainTransfer } from '../hooks/useOnchainTransfer';
import { WalletRecoveryModal } from '../components/WalletRecoveryModal';

export default function SendScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isReady, logout } = usePrivy();
  const solanaWalletState = useEmbeddedSolanaWallet();
  const {
    transfer,
    isTransferring,
    isWalletReady,
    needsRecovery,
    walletStatus,
    statusMessage,
  } = useOnchainTransfer();

  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  const [searchInput, setSearchInput] = useState((params.recipient as string) || '');
  const [debouncedInput, setDebouncedInput] = useState((params.recipient as string) || '');
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [amount, setAmount] = useState('0.001');
  const [solBalance, setSolBalance] = useState<number | null>(null);

  // Lấy địa chỉ ví người dùng hiện tại
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

  useEffect(() => {
    if (myAddress) {
      getSolanaBalance(myAddress).then(setSolBalance).catch(console.log);
    }
  }, [myAddress]);

  // 1. Debounce 500ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedInput(searchInput.trim());
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  // 2. Logic phân loại định dạng & Tra cứu ví Supabase
  useEffect(() => {
    if (!debouncedInput) {
      setResolvedAddress(null);
      setSearchError('');
      setIsLoadingLookup(false);
      return;
    }

    const isPhone = /^[+]?[0-9]{8,15}$/.test(debouncedInput);
    const isSolanaBase58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(debouncedInput);

    // Trường hợp 1: Nhập trực tiếp địa chỉ Base58 hợp lệ
    if (isSolanaBase58 && !isPhone) {
      setResolvedAddress(debouncedInput);
      setSearchError('');
      setIsLoadingLookup(false);
      return;
    }

    // Trường hợp 2: Nhập số điện thoại -> Gọi Supabase Identity Lookup
    if (isPhone) {
      let isMounted = true;
      setIsLoadingLookup(true);
      setSearchError('');
      setResolvedAddress(null);

      lookupWalletByPhone(debouncedInput)
        .then((foundAddress) => {
          if (!isMounted) return;
          setIsLoadingLookup(false);
          if (foundAddress) {
            setResolvedAddress(foundAddress);
            setSearchError('');
          } else {
            setResolvedAddress(null);
            setSearchError('Số điện thoại này chưa liên kết ví N.E.D');
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          setIsLoadingLookup(false);
          setResolvedAddress(null);
          setSearchError('Lỗi tra cứu thông tin ví.');
          console.log('Phone lookup error:', err);
        });

      return () => {
        isMounted = false;
      };
    }

    // Trường hợp 3: Chuỗi không hợp lệ
    if (debouncedInput.length > 5) {
      setResolvedAddress(null);
      setSearchError('Định dạng địa chỉ ví hoặc số điện thoại không hợp lệ');
      setIsLoadingLookup(false);
    } else {
      setResolvedAddress(null);
      setSearchError('');
      setIsLoadingLookup(false);
    }
  }, [debouncedInput]);

  const copyToClipboard = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Thông báo', 'Đã sao chép địa chỉ ví!');
    } catch (e) {
      console.log('Copy error:', e);
    }
  };

  // THỰC THI GIAO DỊCH ON-CHAIN 100% TRÊN SOLANA DEVNET
  const handleSendTransaction = async () => {
    if (!myAddress) {
      Alert.alert('Thông báo', 'Không tìm thấy địa chỉ ví người gửi.');
      return;
    }

    const recipientInput = (resolvedAddress || searchInput).trim();
    if (!recipientInput) {
      Alert.alert('Thông báo', 'Vui lòng nhập số điện thoại hoặc địa chỉ ví người nhận.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập số lượng SOL hợp lệ (lớn hơn 0).');
      return;
    }

    if (!isWalletReady) {
      Alert.alert(
        'Ví đang kết nối',
        `Ví nhúng đang ở trạng thái (${walletStatus}). Vui lòng chờ vài giây để kết nối hoàn tất!`
      );
      return;
    }

    try {
      const result = await transfer({
        fromAddress: myAddress,
        recipientAddressOrPhone: recipientInput,
        amountSol: numAmount,
      });

      if (!result.success || !result.transactionHash) {
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
                  const { executeHardReset } = await import('../services/storage');
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

      // Lưu log lịch sử giao dịch on-chain vào cache
      const currentActs = (await getCachedActivities()) || [];
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
      await cacheActivities([newAct, ...currentActs]);

      Alert.alert(
        'Giao Dịch Thành Công! ⚡',
        `Đã chuyển ${numAmount} SOL đến:\n${formatShortAddress(finalRecipient)}\nChữ ký: ${txSignature.slice(0, 16)}...`,
        [{ text: 'Về Trang Chủ', onPress: () => router.replace('/') }]
      );
    } catch (err: any) {
      console.error('Send Transaction Error:', err);
      Alert.alert('Lỗi Giao Dịch', err?.message || 'Không thể thực hiện chuyển tiền.');
    }
  };

  const formatShortAddress = (addr: string) => {
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  // Bảo vệ giao diện: Chỉ render khi ví và tài khoản đã sẵn sàng
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00A859" />
        <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '600' }}>
          Đang xác thực phiên đăng nhập...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chuyển Tiền</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Thanh Tìm Kiếm Thông Minh (Smart Debounce Input) */}
          <View style={styles.inputSection}>
            <Text style={styles.fieldLabel}>Người nhận:</Text>
            <View
              style={[
                styles.searchBox,
                resolvedAddress && styles.searchBoxSuccess,
                searchError && styles.searchBoxError,
              ]}
            >
              <Feather name="search" size={18} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Nhập số điện thoại hoặc địa chỉ ví..."
                placeholderTextColor="#94A3B8"
                value={searchInput}
                onChangeText={setSearchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.rightActionBox}>
                {isLoadingLookup && <ActivityIndicator size="small" color="#00A859" />}
              </View>
            </View>
          </View>

          {/* 2. Trạng Thái UI Phản Hồi: Thành Công (Tìm Thấy Ví) */}
          {resolvedAddress && (
            <View style={styles.successCard}>
              <View style={styles.successIconBox}>
                <Ionicons name="checkmark-circle" size={22} color="#00A859" />
              </View>
              <View style={styles.successInfoCol}>
                <Text style={styles.successTitle}>Đã tìm thấy ví N.E.D</Text>
                <Text style={styles.successAddressText}>
                  {formatShortAddress(resolvedAddress)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.copyPillBtn}
                onPress={() => copyToClipboard(resolvedAddress)}
              >
                <Text style={styles.copyPillText}>Sao chép</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 3. Trạng Thái UI Phản Hồi: Thất Bại (Báo Lỗi Chữ Đỏ) */}
          {searchError ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{searchError}</Text>
            </View>
          ) : null}

          {/* 4. Nhập Số Lượng SOL */}
          <View style={[styles.inputSection, { marginTop: 18 }]}>
            <View style={styles.amountHeaderRow}>
              <Text style={styles.fieldLabel}>Số lượng chuyển:</Text>
              {solBalance !== null && (
                <Text style={styles.balanceHintText}>
                  Khả dụng: {solBalance.toFixed(4)} SOL
                </Text>
              )}
            </View>

            <View style={styles.amountInputRow}>
              <TextInput
                style={styles.amountInput}
                placeholder="0.001"
                placeholderTextColor="#94A3B8"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
              <View style={styles.currencyBadge}>
                <Text style={styles.currencyBadgeText}>SOL</Text>
              </View>
            </View>

            {/* Quick Amount Pills */}
            <View style={styles.quickAmountRow}>
              {['0.001', '0.005', '0.01', '0.05'].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.quickPill, amount === amt && styles.quickPillActive]}
                  onPress={() => setAmount(amt)}
                >
                  <Text style={[styles.quickPillText, amount === amt && styles.quickPillTextActive]}>
                    {amt} SOL
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 5. Nút Xác Nhận Chuyển Tiền */}
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!resolvedAddress && !searchInput.trim() || isTransferring || isLoadingLookup || !isReady || !user || !isWalletReady) && styles.sendBtnDisabled,
            ]}
            onPress={() => {
              handleSendTransaction();
            }}
            disabled={!isReady || !user || (!resolvedAddress && !searchInput.trim()) || isTransferring || isLoadingLookup || !isWalletReady}
            activeOpacity={0.85}
          >
            {isTransferring ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (!isWalletReady || !isReady || !user) ? (
              <View style={styles.sendBtnInner}>
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.sendBtnText}>Đang kết nối ví...</Text>
              </View>
            ) : (
              <View style={styles.sendBtnInner}>
                <Feather name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.sendBtnText}>Xác nhận Chuyển tiền</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Khôi phục Ví Bảo Mật */}
      <WalletRecoveryModal
        visible={showRecoveryModal || needsRecovery}
        onClose={() => setShowRecoveryModal(false)}
        onSuccess={() => setShowRecoveryModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 20,
  },
  inputSection: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
  },
  searchBoxSuccess: {
    borderColor: '#00A859',
    backgroundColor: '#F0FDF4',
  },
  searchBoxError: {
    borderColor: '#EF4444',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  rightActionBox: {
    marginLeft: 6,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
  },
  successIconBox: {
    marginRight: 10,
  },
  successInfoCol: {
    flex: 1,
  },
  successTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  successAddressText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#15803D',
    fontWeight: '600',
    marginTop: 1,
  },
  copyPillBtn: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  copyPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  amountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  balanceHintText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  currencyBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currencyBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
  },
  quickAmountRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  quickPill: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    alignItems: 'center',
  },
  quickPillActive: {
    backgroundColor: '#00A859',
  },
  quickPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  quickPillTextActive: {
    color: '#FFFFFF',
  },
  sendBtn: {
    backgroundColor: '#00A859',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  sendBtnRecovery: {
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
