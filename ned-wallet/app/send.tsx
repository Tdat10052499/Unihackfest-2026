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
  lookupWalletByPhone,
  getUserPhoneNumberFromDB,
  isSamePhoneNumber,
  getAccountIdentifier,
  getMaskedPhone,
} from '../services/supabase';
import {
  getSolanaBalance,
  ActivityItem,
  formatFiatBalance,
  USD_TO_VND_RATE,
} from '../services/solana';
import { cacheActivities, getCachedActivities, getLinkedPhone } from '../services/storage';
import { useOnchainTransfer } from '../hooks/useOnchainTransfer';
import { WalletRecoveryModal } from '../components/WalletRecoveryModal';
import { useTranslation } from '../services/i18n';

export default function SendScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { user, isReady, logout } = usePrivy();
  const solanaWalletState = useEmbeddedSolanaWallet();
  const {
    transfer,
    isTransferring,
    isWalletReady,
    needsRecovery,
    walletStatus,
  } = useOnchainTransfer();

  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  const [searchInput, setSearchInput] = useState((params.recipient as string) || '');
  const [debouncedInput, setDebouncedInput] = useState((params.recipient as string) || '');
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvedPhone, setResolvedPhone] = useState<string | null>(null);
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [amount, setAmount] = useState('5');
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [myPhone, setMyPhone] = useState<string | null>(null);

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

  // Nạp SĐT và số dư của chính người dùng
  useEffect(() => {
    const loadUserData = async () => {
      if (myAddress) {
        getSolanaBalance(myAddress).then(setSolBalance).catch(console.log);
      }
      const cachedPhone = await getLinkedPhone();
      if (cachedPhone) setMyPhone(cachedPhone);
      if (user?.id) {
        const dbPhone = await getUserPhoneNumberFromDB(user.id);
        if (dbPhone) setMyPhone(dbPhone);
      }
    };
    loadUserData();
  }, [myAddress, user]);

  // 1. Debounce 500ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedInput(searchInput.trim());
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  // 2. Logic phân loại định dạng, Chặn tự chuyển tiền & Tra cứu ví Supabase
  useEffect(() => {
    if (!debouncedInput) {
      setResolvedAddress(null);
      setResolvedPhone(null);
      setSearchError('');
      setIsLoadingLookup(false);
      return;
    }

    const isPhone = /^[+]?[0-9]{8,15}$/.test(debouncedInput);
    const isSolanaBase58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(debouncedInput);

    // Chặn 1: Người dùng nhập chính SĐT của mình
    if (isPhone && myPhone && isSamePhoneNumber(debouncedInput, myPhone)) {
      setResolvedAddress(null);
      setResolvedPhone(null);
      setSearchError(t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình' }));
      setIsLoadingLookup(false);
      return;
    }

    // Chặn 2: Người dùng nhập chính địa chỉ ví của mình
    if (myAddress && debouncedInput.toLowerCase() === myAddress.toLowerCase()) {
      setResolvedAddress(null);
      setResolvedPhone(null);
      setSearchError(t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình' }));
      setIsLoadingLookup(false);
      return;
    }

    // Trường hợp 1: Nhập trực tiếp địa chỉ Base58 hợp lệ
    if (isSolanaBase58 && !isPhone) {
      if (myAddress && debouncedInput.toLowerCase() === myAddress.toLowerCase()) {
        setResolvedAddress(null);
        setResolvedPhone(null);
        setSearchError(t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình' }));
      } else {
        setResolvedAddress(debouncedInput);
        setResolvedPhone(null);
        setSearchError('');
      }
      setIsLoadingLookup(false);
      return;
    }

    // Trường hợp 2: Nhập số điện thoại -> Gọi Supabase Identity Lookup
    if (isPhone) {
      let isMounted = true;
      setIsLoadingLookup(true);
      setSearchError('');
      setResolvedAddress(null);
      setResolvedPhone(null);

      lookupWalletByPhone(debouncedInput)
        .then((foundAddress) => {
          if (!isMounted) return;
          setIsLoadingLookup(false);
          if (foundAddress) {
            if (myAddress && foundAddress.toLowerCase() === myAddress.toLowerCase()) {
              setResolvedAddress(null);
              setResolvedPhone(null);
              setSearchError(t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình' }));
            } else {
              setResolvedAddress(foundAddress);
              setResolvedPhone(debouncedInput);
              setSearchError('');
            }
          } else {
            setResolvedAddress(null);
            setResolvedPhone(null);
            setSearchError(t('send.phoneNotLinked', { defaultValue: 'Số điện thoại này chưa liên kết tài khoản N.E.D' }));
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          setIsLoadingLookup(false);
          setResolvedAddress(null);
          setResolvedPhone(null);
          setSearchError(t('send.lookupError', { defaultValue: 'Lỗi tra cứu thông tin tài khoản.' }));
          console.log('Phone lookup error:', err);
        });

      return () => {
        isMounted = false;
      };
    }

    // Trường hợp 3: Chuỗi không hợp lệ
    if (debouncedInput.length > 5) {
      setResolvedAddress(null);
      setResolvedPhone(null);
      setSearchError(t('send.invalidRecipient', { defaultValue: 'Định dạng tài khoản hoặc số điện thoại không hợp lệ' }));
      setIsLoadingLookup(false);
    } else {
      setResolvedAddress(null);
      setResolvedPhone(null);
      setSearchError('');
      setIsLoadingLookup(false);
    }
  }, [debouncedInput, myAddress, myPhone, t]);

  const copyToClipboard = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert(
        t('settings.title', { defaultValue: 'Thông báo' }),
        t('deposit.copiedAlert', { defaultValue: 'Đã sao chép vào bộ nhớ tạm!' })
      );
    } catch (e) {
      console.log('Copy error:', e);
    }
  };

  // THỰC THI GIAO DỊCH 100% ON-CHAIN GASLESS
  const handleSendTransaction = async () => {
    if (!myAddress) {
      Alert.alert(
        t('settings.title', { defaultValue: 'Thông báo' }),
        t('deposit.noAddress', { defaultValue: 'Không tìm thấy địa chỉ tài khoản người gửi.' })
      );
      return;
    }

    const recipientInput = (resolvedAddress || searchInput).trim();
    if (!recipientInput) {
      Alert.alert(
        t('settings.title', { defaultValue: 'Thông báo' }),
        t('send.invalidRecipient', { defaultValue: 'Vui lòng nhập số điện thoại hoặc tài khoản người nhận.' })
      );
      return;
    }

    // Chặn người dùng tự chuyển cho bản thân
    if (myAddress && recipientInput.toLowerCase() === myAddress.toLowerCase()) {
      Alert.alert(
        t('settings.title', { defaultValue: 'Không thể thực hiện ⚠️' }),
        t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình.' })
      );
      return;
    }

    if (myPhone && isSamePhoneNumber(recipientInput, myPhone)) {
      Alert.alert(
        t('settings.title', { defaultValue: 'Không thể thực hiện ⚠️' }),
        t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình.' })
      );
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(
        t('settings.title', { defaultValue: 'Thông báo' }),
        t('send.invalidAmount', { defaultValue: 'Vui lòng nhập số tiền hợp lệ (lớn hơn 0).' })
      );
      return;
    }

    if (!isWalletReady) {
      Alert.alert(
        t('settings.title', { defaultValue: 'Tài khoản đang kết nối' }),
        `Tài khoản đang ở trạng thái (${walletStatus}). Vui lòng chờ vài giây để hoàn tất kết nối!`
      );
      return;
    }

    try {
      const result = await transfer({
        fromAddress: myAddress,
        recipientAddressOrPhone: recipientInput,
        amountUsd: numAmount,
      });

      if (!result.success || !result.transactionHash) {
        const errorMsg = result.error || 'Không thể thực hiện chuyển tiền.';
        if (
          errorMsg.includes('timeout') ||
          errorMsg.includes('user-signer') ||
          errorMsg.includes('WebView')
        ) {
          Alert.alert(
            t('settings.resetTitle', { defaultValue: 'Phiên làm việc bị gián đoạn ⚠️' }),
            t('settings.resetMsg', { defaultValue: 'Phiên kết nối đang bị treo. Bạn có muốn làm mới phiên đăng nhập ngay?' }),
            [
              { text: t('settings.cancel', { defaultValue: 'Đóng' }), style: 'cancel' },
              {
                text: t('settings.confirmReset', { defaultValue: 'Làm mới ngay' }),
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

        Alert.alert(t('send.failedTitle', { defaultValue: 'Chuyển tiền chưa hoàn tất ❌' }), errorMsg);
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
        amount: `-$${numAmount.toFixed(2)}`,
        isPositive: false,
        iconBg: '#374151',
        signature: txSignature,
        blockTime: Math.floor(Date.now() / 1000),
      };
      await cacheActivities([newAct, ...currentActs]);

      const recipientDisplayName = resolvedPhone
        ? getMaskedPhone(resolvedPhone)
        : getAccountIdentifier(null, finalRecipient);

      Alert.alert(
        t('send.successTitle', { defaultValue: 'Chuyển Tiền Thành Công! ⚡' }),
        `Đã chuyển $${numAmount.toFixed(2)} (${(numAmount * USD_TO_VND_RATE).toLocaleString('vi-VN')} ₫) đến:\n${recipientDisplayName}\n\nMã giao dịch: ${txSignature.slice(0, 16)}...`,
        [{ text: t('tabs.home', { defaultValue: 'Về Trang Chủ' }), onPress: () => router.replace('/') }]
      );
    } catch (err: any) {
      console.error('Send Transaction Error:', err);
      Alert.alert(t('send.failedTitle', { defaultValue: 'Lỗi Giao Dịch' }), err?.message || 'Không thể thực hiện chuyển tiền.');
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const vndEquivalent = Math.round(parsedAmount * USD_TO_VND_RATE);
  const availableUsd = solBalance !== null ? solBalance * 150 : 0;

  // Bảo vệ giao diện: Chỉ render khi ví và tài khoản đã sẵn sàng
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00A859" />
        <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '600' }}>
          {t('activities.loading', { defaultValue: 'Đang xác thực phiên đăng nhập...' })}
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
          <Text style={styles.headerTitle}>{t('send.title', { defaultValue: 'Chuyển Tiền' })}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Thanh Tìm Kiếm Thông Minh (Smart Debounce Input) */}
          <View style={styles.inputSection}>
            <Text style={styles.fieldLabel}>{t('send.recipientLabel', { defaultValue: 'Người nhận:' })}</Text>
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
                placeholder={t('send.recipientPlaceholder', { defaultValue: 'Nhập số điện thoại người nhận...' })}
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

          {/* 2. Trạng Thái UI Phản Hồi: Thành Công (Tìm Thấy Tài Khoản) */}
          {resolvedAddress && (
            <View style={styles.successCard}>
              <View style={styles.successIconBox}>
                <Ionicons name="checkmark-circle" size={22} color="#00A859" />
              </View>
              <View style={styles.successInfoCol}>
                <Text style={styles.successTitle}>
                  {resolvedPhone
                    ? `Tài khoản: ${getMaskedPhone(resolvedPhone)}`
                    : `Tài khoản: ${getAccountIdentifier(null, resolvedPhone)}`}
                </Text>
                <Text style={styles.successAddressText}>
                  Đã xác thực danh tính N.E.D
                </Text>
              </View>
              <TouchableOpacity
                style={styles.copyPillBtn}
                onPress={() => copyToClipboard(resolvedPhone || resolvedAddress)}
              >
                <Text style={styles.copyPillText}>{t('deposit.copyAddress', { defaultValue: 'Sao chép' })}</Text>
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

          {/* 4. Nhập Số Tiền USD / VND */}
          <View style={[styles.inputSection, { marginTop: 18 }]}>
            <View style={styles.amountHeaderRow}>
              <Text style={styles.fieldLabel}>{t('send.amountLabel', { defaultValue: 'Số tiền chuyển:' })}</Text>
              <Text style={styles.balanceHintText}>
                Khả dụng: {formatFiatBalance(availableUsd, 'USD')}
              </Text>
            </View>

            <View style={styles.amountInputRow}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="5.00"
                placeholderTextColor="#94A3B8"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
              <View style={styles.currencyBadge}>
                <Text style={styles.currencyBadgeText}>USD</Text>
              </View>
            </View>

            {/* Dòng quy đổi tỷ giá VND thời gian thực & Gasless Badge */}
            <View style={styles.rateHintRow}>
              <Text style={styles.rateHintText}>
                ≈ {vndEquivalent.toLocaleString('vi-VN')} ₫ ($1 = 25.000 ₫)
              </Text>
              <View style={styles.gaslessBadge}>
                <Ionicons name="flash" size={12} color="#059669" />
                <Text style={styles.gaslessText}>Miễn phí chuyển tiền</Text>
              </View>
            </View>

            {/* Quick Amount Pills */}
            <View style={styles.quickAmountRow}>
              {['2', '5', '10', '20'].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.quickPill, amount === amt && styles.quickPillActive]}
                  onPress={() => setAmount(amt)}
                >
                  <Text style={[styles.quickPillText, amount === amt && styles.quickPillTextActive]}>
                    ${amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 5. Nút Xác Nhận Chuyển Tiền */}
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!resolvedAddress || !!searchError || isTransferring || isLoadingLookup || !isReady || !user || !isWalletReady) && styles.sendBtnDisabled,
            ]}
            onPress={() => {
              handleSendTransaction();
            }}
            disabled={!isReady || !user || !resolvedAddress || !!searchError || isTransferring || isLoadingLookup || !isWalletReady}
            activeOpacity={0.85}
          >
            {isTransferring ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (!isWalletReady || !isReady || !user) ? (
              <View style={styles.sendBtnInner}>
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.sendBtnText}>{t('send.lookupButton', { defaultValue: 'Đang kết nối tài khoản...' })}</Text>
              </View>
            ) : (
              <View style={styles.sendBtnInner}>
                <Feather name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.sendBtnText}>{t('send.sendButton', { defaultValue: 'Xác nhận chuyển' })}</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Khôi phục Tài Khoản Bảo Mật */}
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
    borderColor: '#86EFAC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  successIconBox: {
    marginRight: 10,
  },
  successInfoCol: {
    flex: 1,
  },
  successTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  successAddressText: {
    fontSize: 12,
    color: '#166534',
    marginTop: 1,
  },
  copyPillBtn: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  copyPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
    flex: 1,
  },
  amountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  balanceHintText: {
    fontSize: 12,
    color: '#00A859',
    fontWeight: '600',
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
    marginBottom: 6,
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  currencyBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currencyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  rateHintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  rateHintText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  gaslessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gaslessText: {
    fontSize: 10.5,
    color: '#059669',
    fontWeight: '700',
    marginLeft: 3,
  },
  quickAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickPill: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 3,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickPillActive: {
    backgroundColor: '#D1F4E0',
    borderColor: '#00A859',
  },
  quickPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  quickPillTextActive: {
    color: '#00A859',
    fontWeight: '700',
  },
  sendBtn: {
    backgroundColor: '#00A859',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 10,
  },
  sendBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
