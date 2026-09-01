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
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import {
  lookupWalletByPhone,
  isSamePhoneNumber,
  getAccountIdentifier,
  getMaskedPhone,
} from '../services/identity';
import { getLinkedPhone } from '../services/storage';
import { formatFiatBalance, USD_TO_VND_RATE } from '../services/solana';
import { useTranslation } from '../services/i18n';

interface SendModalProps {
  visible: boolean;
  onClose: () => void;
  solanaAddress: string | null;
  solBalance: number | null;
  initialRecipient?: string;
  onOpenScanner?: () => void;
  onConfirmSend: (recipientAddress: string, amountUsd: number) => Promise<void>;
  isSending?: boolean;
  needsRecovery?: boolean;
  onTriggerRecovery?: () => void;
}

export const SendModal: React.FC<SendModalProps> = ({
  visible,
  onClose,
  solanaAddress,
  solBalance,
  initialRecipient = '',
  onOpenScanner,
  onConfirmSend,
  isSending = false,
  needsRecovery = false,
  onTriggerRecovery,
}) => {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState(initialRecipient);
  const [debouncedInput, setDebouncedInput] = useState(initialRecipient);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvedPhone, setResolvedPhone] = useState<string | null>(null);
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [amount, setAmount] = useState('5');
  const [myPhone, setMyPhone] = useState<string | null>(null);

  // Nạp SĐT của chính người dùng từ local cache
  useEffect(() => {
    getLinkedPhone().then((p) => {
      if (p) setMyPhone(p);
    });
  }, [visible]);

  // Cập nhật khi initialRecipient thay đổi (ví dụ sau khi quét QR)
  useEffect(() => {
    if (initialRecipient) {
      setSearchInput(initialRecipient);
    }
  }, [initialRecipient]);

  // 1. Cơ chế Debounce 500ms
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
    if (solanaAddress && debouncedInput.toLowerCase() === solanaAddress.toLowerCase()) {
      setResolvedAddress(null);
      setResolvedPhone(null);
      setSearchError(t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình' }));
      setIsLoadingLookup(false);
      return;
    }

    // Trường hợp 1: Nhập trực tiếp địa chỉ Base58 hợp lệ
    if (isSolanaBase58 && !isPhone) {
      if (solanaAddress && debouncedInput.toLowerCase() === solanaAddress.toLowerCase()) {
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
            if (solanaAddress && foundAddress.toLowerCase() === solanaAddress.toLowerCase()) {
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
  }, [debouncedInput, solanaAddress, myPhone, t]);

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

  const handleSend = async () => {
    if (needsRecovery) {
      onTriggerRecovery?.();
      return;
    }

    let targetWallet = resolvedAddress;

    if (!targetWallet) {
      const input = searchInput.trim();
      if (!input) {
        Alert.alert(
          t('settings.title', { defaultValue: 'Thông báo' }),
          t('send.invalidRecipient', { defaultValue: 'Vui lòng nhập số điện thoại hoặc tài khoản người nhận.' })
        );
        return;
      }

      if (myPhone && isSamePhoneNumber(input, myPhone)) {
        Alert.alert(
          t('settings.title', { defaultValue: 'Thông báo' }),
          t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình.' })
        );
        return;
      }

      if (solanaAddress && input.toLowerCase() === solanaAddress.toLowerCase()) {
        Alert.alert(
          t('settings.title', { defaultValue: 'Thông báo' }),
          t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình.' })
        );
        return;
      }

      const isSolanaBase58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input);
      if (isSolanaBase58) {
        targetWallet = input;
      } else {
        setIsLoadingLookup(true);
        targetWallet = await lookupWalletByPhone(input);
        setIsLoadingLookup(false);
      }
    }

    if (!targetWallet) {
      Alert.alert(
        t('send.failedTitle', { defaultValue: 'Không tìm thấy tài khoản' }),
        t('send.phoneNotLinked', { defaultValue: 'Không tìm thấy tài khoản liên kết với số điện thoại này.' })
      );
      return;
    }

    if (solanaAddress && targetWallet.toLowerCase() === solanaAddress.toLowerCase()) {
      Alert.alert(
        t('settings.title', { defaultValue: 'Thông báo' }),
        t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình.' })
      );
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(
        t('settings.title', { defaultValue: 'Thông báo' }),
        t('send.invalidAmount', { defaultValue: 'Vui lòng nhập số tiền hợp lệ.' })
      );
      return;
    }

    await onConfirmSend(targetWallet, numAmount);
  };

  const parsedAmount = parseFloat(amount) || 0;
  const vndEquivalent = Math.round(parsedAmount * USD_TO_VND_RATE);
  const availableUsd = solBalance !== null ? solBalance * 150 : 0;

  if (!visible) return null;

  return (
    <View style={styles.overlayWrapper} pointerEvents="box-none">
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropDismissArea}
          activeOpacity={1}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.bottomSheetContainer}>
            {/* Drag handle */}
            <View style={styles.dragHandle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.headerTitleCol}>
                <Text style={styles.sheetTitle}>{t('send.title', { defaultValue: 'Chuyển Tiền' })}</Text>
                <Text style={styles.sheetSubtitle}>
                  {t('send.subtitle', { defaultValue: 'Chuyển tiền nhanh chóng qua số điện thoại hoặc mã N.E.D' })}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 10 }}
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
                  <Feather
                    name="search"
                    size={18}
                    color="#64748B"
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={t('send.recipientPlaceholder', { defaultValue: 'Nhập số điện thoại người nhận...' })}
                    placeholderTextColor="#94A3B8"
                    value={searchInput}
                    onChangeText={setSearchInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  {/* Vùng bên phải ô nhập: Spinner hoặc Nút quét QR */}
                  <View style={styles.rightActionBox}>
                    {isLoadingLookup ? (
                      <ActivityIndicator size="small" color="#00A859" />
                    ) : onOpenScanner ? (
                      <TouchableOpacity
                        onPress={onOpenScanner}
                        style={styles.qrScanBtn}
                      >
                        <Ionicons
                          name="qr-code-outline"
                          size={20}
                          color="#00A859"
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* 2. Trạng Thái UI Phản Hồi: Thành Công (Tìm Thấy Tài Khoản) */}
              {resolvedAddress && (
                <View style={styles.successCard}>
                  <View style={styles.successIconBox}>
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#00A859"
                    />
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
                  <Feather
                    name="alert-circle"
                    size={16}
                    color="#DC2626"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.errorText}>{searchError}</Text>
                </View>
              ) : null}

              {/* 4. Nhập Số Tiền USD / VND */}
              <View style={[styles.inputSection, { marginTop: 14 }]}>
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

                {/* Dòng quy đổi tỷ giá VND thời gian thực */}
                <View style={styles.rateHintRow}>
                  <Text style={styles.rateHintText}>
                    ≈ {vndEquivalent.toLocaleString('vi-VN')} ₫ (Tỷ giá: $1 = 25.000 ₫)
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
                      style={[
                        styles.quickPill,
                        amount === amt && styles.quickPillActive,
                      ]}
                      onPress={() => setAmount(amt)}
                    >
                      <Text
                        style={[
                          styles.quickPillText,
                          amount === amt && styles.quickPillTextActive,
                        ]}
                      >
                        ${amt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 5. Nút Xác Nhận Chuyển Tiền / Khôi phục ví */}
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  needsRecovery && styles.sendBtnRecovery,
                  ((!resolvedAddress && !needsRecovery) || !!searchError || isSending || isLoadingLookup) &&
                    styles.sendBtnDisabled,
                ]}
                onPress={handleSend}
                disabled={((!resolvedAddress && !needsRecovery) || !!searchError) || isSending || isLoadingLookup}
                activeOpacity={0.85}
              >
                {needsRecovery ? (
                  <View style={styles.sendBtnInner}>
                    <MaterialCommunityIcons
                      name="shield-key"
                      size={20}
                      color="#FFFFFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.sendBtnText}>{t('home.recover', { defaultValue: 'Khôi phục tài khoản' })}</Text>
                  </View>
                ) : isSending ? (
                  <View style={styles.sendBtnInner}>
                    <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                    <Text style={styles.sendBtnText}>Đang thực hiện chuyển tiền...</Text>
                  </View>
                ) : (
                  <View style={styles.sendBtnInner}>
                    <Feather
                      name="send"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.sendBtnText}>{t('send.sendButton', { defaultValue: 'Xác nhận chuyển' })}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  backdropDismissArea: {
    flex: 1,
  },
  bottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    maxHeight: '90%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleCol: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputSection: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  searchBoxSuccess: {
    borderColor: '#00A859',
    backgroundColor: '#F0FDF4',
  },
  searchBoxError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 8,
  },
  rightActionBox: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  qrScanBtn: {
    padding: 4,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
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
    marginBottom: 10,
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
    marginBottom: 8,
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
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
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
    fontSize: 12,
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
  },
  sendBtnRecovery: {
    backgroundColor: '#D97706',
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
