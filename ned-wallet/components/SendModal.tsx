import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { lookupWalletByPhone } from '../services/supabase';

interface SendModalProps {
  visible: boolean;
  onClose: () => void;
  solanaAddress: string | null;
  solBalance: number | null;
  initialRecipient?: string;
  onOpenScanner?: () => void;
  onConfirmSend: (recipientAddress: string, amountSol: number) => Promise<void>;
  isSending?: boolean;
  needsRecovery?: boolean;
  onTriggerRecovery?: () => void;
}

export const SendModal: React.FC<SendModalProps> = ({
  visible,
  onClose,
  solBalance,
  initialRecipient = '',
  onOpenScanner,
  onConfirmSend,
  isSending = false,
  needsRecovery = false,
  onTriggerRecovery,
}) => {
  const [searchInput, setSearchInput] = useState(initialRecipient);
  const [debouncedInput, setDebouncedInput] = useState(initialRecipient);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [amount, setAmount] = useState('0.001');

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

  const handleSend = async () => {
    if (needsRecovery) {
      onTriggerRecovery?.();
      return;
    }

    let targetWallet = resolvedAddress;

    if (!targetWallet) {
      const input = searchInput.trim();
      if (!input) {
        Alert.alert('Thông báo', 'Vui lòng nhập số điện thoại hoặc địa chỉ ví người nhận.');
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
        'Không tìm thấy ví',
        'Không tìm thấy ví liên kết với số điện thoại này. Vui lòng kiểm tra lại số điện thoại.'
      );
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập số lượng SOL hợp lệ.');
      return;
    }

    await onConfirmSend(targetWallet, numAmount);
  };

  const formatShortAddress = (addr: string) => {
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

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
                <Text style={styles.sheetTitle}>Chuyển Tiền (Send)</Text>
                <Text style={styles.sheetSubtitle}>
                  Tìm ví qua số điện thoại hoặc địa chỉ Solana
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
                <Text style={styles.fieldLabel}>Người nhận:</Text>
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
                    placeholder="Nhập số điện thoại hoặc địa chỉ ví..."
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

              {/* 2. Trạng Thái UI Phản Hồi: Thành Công (Tìm Thấy Ví) */}
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
                  <Feather
                    name="alert-circle"
                    size={16}
                    color="#DC2626"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.errorText}>{searchError}</Text>
                </View>
              ) : null}

              {/* 4. Nhập Số Lượng SOL */}
              <View style={[styles.inputSection, { marginTop: 14 }]}>
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
                        {amt} SOL
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
                  (!resolvedAddress && !needsRecovery || isSending || isLoadingLookup) &&
                    styles.sendBtnDisabled,
                ]}
                onPress={handleSend}
                disabled={(!resolvedAddress && !needsRecovery) || isSending || isLoadingLookup}
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
                    <Text style={styles.sendBtnText}>Khôi phục ví bảo mật</Text>
                  </View>
                ) : isSending ? (
                  <View style={styles.sendBtnInner}>
                    <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                    <Text style={styles.sendBtnText}>Đang chờ mạng lưới xác nhận...</Text>
                  </View>
                ) : (
                  <View style={styles.sendBtnInner}>
                    <Feather
                      name="send"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.sendBtnText}>Xác nhận Chuyển tiền</Text>
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
    color: '#111827',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // Input & Search
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
    paddingHorizontal: 12,
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
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrScanBtn: {
    padding: 4,
  },

  // Success Card
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    marginBottom: 4,
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

  // Error Box
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },

  // Amount
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

  // Send Button
  sendBtn: {
    backgroundColor: '#00A859',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
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
