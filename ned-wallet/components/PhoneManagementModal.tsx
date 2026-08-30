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
import { Ionicons, Feather } from '@expo/vector-icons';
import {
  updatePhoneNumber,
  unlinkPhoneNumber,
  normalizePhoneNumber,
} from '../services/supabase';
import {
  setLinkedPhone,
  removeLinkedPhone,
} from '../services/storage';

interface PhoneManagementModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  walletAddress: string;
  currentPhone: string | null;
  onPhoneUpdated: (newPhone: string | null) => void;
}

type ManagementMode = 'VIEW' | 'UPDATE_INPUT' | 'UPDATE_OTP' | 'UNLINK_CONFIRM';

export const PhoneManagementModal: React.FC<PhoneManagementModalProps> = ({
  visible,
  onClose,
  userId,
  walletAddress,
  currentPhone,
  onPhoneUpdated,
}) => {
  const [mode, setMode] = useState<ManagementMode>('VIEW');
  const [newPhone, setNewPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset state khi mở modal
  useEffect(() => {
    if (visible) {
      setMode('VIEW');
      setNewPhone('');
      setOtpCode('');
      setConfirmDeleteInput('');
      setErrorMessage('');
      setIsLoading(false);
    }
  }, [visible]);

  // Hàm ẩn một phần số điện thoại (Masking)
  const getMaskedPhone = (rawPhone: string | null): string => {
    if (!rawPhone) return 'Chưa liên kết';
    const cleaned = rawPhone.trim();
    if (cleaned.length < 8) return cleaned;
    const prefix = cleaned.slice(0, 5); // e.g. +84 9
    const suffix = cleaned.slice(-2);   // e.g. 78
    const middleCount = Math.max(3, cleaned.length - 7);
    const masked = 'x'.repeat(middleCount);
    return `${prefix} ${masked} ${suffix}`;
  };

  // 1. Luồng Thay Đổi: Gửi OTP cho số điện thoại mới
  const handleRequestUpdateOtp = () => {
    const trimmed = newPhone.trim().replace(/[^\d+]/g, '');
    if (!trimmed || trimmed.length < 9) {
      setErrorMessage('Vui lòng nhập số điện thoại mới hợp lệ (tối thiểu 9 số).');
      return;
    }
    if (currentPhone && normalizePhoneNumber(trimmed) === normalizePhoneNumber(currentPhone)) {
      setErrorMessage('Số điện thoại mới trùng với số điện thoại hiện tại.');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setMode('UPDATE_OTP');
    }, 600);
  };

  // 2. Luồng Thay Đổi: Xác thực Mock OTP và UPDATE Supabase
  const handleVerifyUpdateOtp = async () => {
    const trimmedOtp = otpCode.trim();
    if (trimmedOtp !== '123456') {
      setErrorMessage('Mã OTP không hợp lệ (Gợi ý: 123456).');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      // Gọi API UPDATE / Upsert Supabase
      const res = await updatePhoneNumber(userId, walletAddress, newPhone);

      if (!res.success) {
        setIsLoading(false);
        Alert.alert('Cập nhật thất bại ❌', res.error || 'Không thể cập nhật số điện thoại.');
        return;
      }

      // Lưu AsyncStorage chỉ khi DB thành công
      await setLinkedPhone(newPhone.trim());

      setIsLoading(false);
      onPhoneUpdated(newPhone.trim());
      setMode('VIEW');

      Alert.alert(
        'Cập Nhật Thành Công! 🎉',
        `Số điện thoại liên kết đã đổi thành ${newPhone.trim()}.`
      );
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert('Lỗi', err?.message || 'Không thể cập nhật số điện thoại lúc này.');
    }
  };

  // 3. Luồng Hủy: Xác nhận chuỗi nhập và DELETE Supabase
  const isDeleteMatching = (): boolean => {
    if (!currentPhone) return false;
    const inputCleaned = confirmDeleteInput.trim().replace(/[^\d+]/g, '');
    const currentCleaned = currentPhone.trim().replace(/[^\d+]/g, '');
    const inputDigits = confirmDeleteInput.trim().replace(/[^\d]/g, '');
    const currentDigits = currentPhone.trim().replace(/[^\d]/g, '');

    return (
      inputCleaned === currentCleaned ||
      inputDigits === currentDigits ||
      (inputDigits.length >= 9 && currentDigits.endsWith(inputDigits))
    );
  };

  const handleConfirmUnlink = async () => {
    if (!isDeleteMatching()) {
      setErrorMessage('Số điện thoại nhập vào không trùng khớp.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      // Gọi API DELETE Supabase
      const res = await unlinkPhoneNumber(userId, currentPhone || undefined);

      if (!res.success) {
        setIsLoading(false);
        Alert.alert('Hủy liên kết thất bại ❌', res.error || 'Không thể hủy liên kết.');
        return;
      }

      // Xóa khỏi AsyncStorage
      await removeLinkedPhone();

      setIsLoading(false);
      onPhoneUpdated(null);
      onClose();

      Alert.alert(
        'Đã Hủy Liên Kết',
        'Đã xóa số điện thoại khỏi tài khoản ví N.E.D.'
      );
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert('Lỗi', err?.message || 'Không thể hủy liên kết lúc này.');
    }
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
          <View style={styles.sheetContainer}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.headerTitleCol}>
                  <Text style={styles.headerTitle}>Quản Lý Số Điện Thoại</Text>
                  <Text style={styles.headerSubtitle}>
                    Cài đặt và bảo mật nhận tiền qua số điện thoại
                  </Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <Ionicons name="close" size={22} color="#374151" />
                </TouchableOpacity>
              </View>

              {/* 1. VIEW MODE: Hiển thị SĐT Masked & 2 Nút Thay Đổi / Hủy */}
              {mode === 'VIEW' && (
                <View style={styles.contentSection}>
                  <View style={styles.phoneDisplayCard}>
                    <View style={styles.phoneIconCircle}>
                      <Feather name="smartphone" size={22} color="#00A859" />
                    </View>
                    <View style={styles.phoneInfoCol}>
                      <Text style={styles.phoneInfoLabel}>Số điện thoại liên kết</Text>
                      <Text style={styles.phoneInfoValue}>
                        {getMaskedPhone(currentPhone)}
                      </Text>
                    </View>
                    <View style={styles.statusVerifiedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#00A859" />
                      <Text style={styles.statusVerifiedText}>Đã xác minh</Text>
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    {/* Nút Thay đổi */}
                    <TouchableOpacity
                      style={styles.changeBtn}
                      onPress={() => {
                        setMode('UPDATE_INPUT');
                        setNewPhone('');
                        setErrorMessage('');
                      }}
                      activeOpacity={0.85}
                    >
                      <Feather name="edit-3" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.changeBtnText}>Thay đổi SĐT</Text>
                    </TouchableOpacity>

                    {/* Nút Hủy liên kết */}
                    <TouchableOpacity
                      style={styles.unlinkBtn}
                      onPress={() => {
                        setMode('UNLINK_CONFIRM');
                        setConfirmDeleteInput('');
                        setErrorMessage('');
                      }}
                      activeOpacity={0.85}
                    >
                      <Feather name="trash-2" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                      <Text style={styles.unlinkBtnText}>Hủy liên kết</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* 2. UPDATE_INPUT MODE: Nhập số điện thoại mới */}
              {mode === 'UPDATE_INPUT' && (
                <View style={styles.contentSection}>
                  <Text style={styles.stepTitle}>Nhập số điện thoại mới</Text>
                  <Text style={styles.stepSubtitle}>
                    Mã xác thực OTP sẽ được gửi đến số điện thoại mới này để kiểm tra.
                  </Text>

                  <View style={styles.inputWrapper}>
                    <View style={styles.flagPrefixBox}>
                      <Text style={styles.flagText}>🇻🇳</Text>
                      <Text style={styles.prefixText}>+84</Text>
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="0987 654 321"
                      placeholderTextColor="#94A3B8"
                      value={newPhone}
                      onChangeText={(text) => {
                        setNewPhone(text);
                        if (errorMessage) setErrorMessage('');
                      }}
                      keyboardType="phone-pad"
                      autoFocus
                    />
                  </View>

                  {errorMessage ? (
                    <View style={styles.errorBox}>
                      <Feather name="alert-circle" size={15} color="#DC2626" style={{ marginRight: 6 }} />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.primaryActionBtn, (!newPhone.trim() || isLoading) && styles.btnDisabled]}
                    onPress={handleRequestUpdateOtp}
                    disabled={!newPhone.trim() || isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.primaryActionBtnText}>Gửi mã xác nhận OTP</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelLinkBtn}
                    onPress={() => {
                      setMode('VIEW');
                      setErrorMessage('');
                    }}
                  >
                    <Text style={styles.cancelLinkText}>Hủy / Quay lại</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 3. UPDATE_OTP MODE: Xác thực Mock OTP cho số mới */}
              {mode === 'UPDATE_OTP' && (
                <View style={styles.contentSection}>
                  <Text style={styles.stepTitle}>Xác thực mã OTP</Text>
                  <Text style={styles.stepSubtitle}>
                    Nhập mã 6 chữ số gửi tới <Text style={{ fontWeight: 'bold', color: '#00A859' }}>{newPhone}</Text>
                  </Text>

                  {/* Hint Mock OTP */}
                  <View style={styles.hintCard}>
                    <Ionicons name="information-circle-outline" size={18} color="#0284C7" />
                    <Text style={styles.hintText}>
                      Mã xác thực thử nghiệm: <Text style={styles.hintCodeBold}>123456</Text>
                    </Text>
                  </View>

                  <View style={styles.otpInputWrapper}>
                    <Feather name="lock" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                    <TextInput
                      style={styles.otpTextInput}
                      placeholder="123456"
                      placeholderTextColor="#94A3B8"
                      value={otpCode}
                      onChangeText={(text) => {
                        setOtpCode(text);
                        if (errorMessage) setErrorMessage('');
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />
                  </View>

                  {errorMessage ? (
                    <View style={styles.errorBox}>
                      <Feather name="alert-circle" size={15} color="#DC2626" style={{ marginRight: 6 }} />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.primaryActionBtn, (!otpCode.trim() || isLoading) && styles.btnDisabled]}
                    onPress={handleVerifyUpdateOtp}
                    disabled={!otpCode.trim() || isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.primaryActionBtnText}>Xác nhận & Cập nhật</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelLinkBtn}
                    onPress={() => {
                      setMode('UPDATE_INPUT');
                      setOtpCode('');
                      setErrorMessage('');
                    }}
                  >
                    <Text style={styles.cancelLinkText}>Quay lại sửa số điện thoại</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 4. UNLINK_CONFIRM MODE: Nhập chính xác SĐT cũ để xác nhận hủy */}
              {mode === 'UNLINK_CONFIRM' && (
                <View style={styles.contentSection}>
                  <View style={styles.dangerWarningBanner}>
                    <Ionicons name="warning" size={24} color="#DC2626" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.dangerTitle}>Xác nhận Hủy liên kết</Text>
                      <Text style={styles.dangerSubtitle}>
                        Sau khi hủy, người khác sẽ không thể chuyển tiền trực tiếp đến bạn qua số điện thoại này.
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.confirmPromptText}>
                    Vui lòng nhập chính xác số điện thoại đầy đủ đang liên kết (
                    <Text style={{ fontWeight: 'bold', color: '#111827' }}>{currentPhone}</Text>
                    ) để xác nhận:
                  </Text>

                  <View style={[styles.inputWrapper, { borderColor: isDeleteMatching() ? '#00A859' : '#E2E8F0' }]}>
                    <TextInput
                      style={styles.textInput}
                      placeholder={currentPhone || 'Nhập số điện thoại đầy đủ'}
                      placeholderTextColor="#94A3B8"
                      value={confirmDeleteInput}
                      onChangeText={(text) => {
                        setConfirmDeleteInput(text);
                        if (errorMessage) setErrorMessage('');
                      }}
                      keyboardType="phone-pad"
                      autoFocus
                    />
                    {isDeleteMatching() && (
                      <Ionicons name="checkmark-circle" size={20} color="#00A859" />
                    )}
                  </View>

                  {errorMessage ? (
                    <View style={styles.errorBox}>
                      <Feather name="alert-circle" size={15} color="#DC2626" style={{ marginRight: 6 }} />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.dangerActionBtn, (!isDeleteMatching() || isLoading) && styles.btnDisabled]}
                    onPress={handleConfirmUnlink}
                    disabled={!isDeleteMatching() || isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.dangerActionBtnText}>Tôi hiểu và muốn Hủy liên kết</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelLinkBtn}
                    onPress={() => {
                      setMode('VIEW');
                      setErrorMessage('');
                    }}
                  >
                    <Text style={styles.cancelLinkText}>Không, giữ lại liên kết</Text>
                  </TouchableOpacity>
                </View>
              )}
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
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
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
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  headerSubtitle: {
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
  contentSection: {
    width: '100%',
  },

  // View Mode
  phoneDisplayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
  },
  phoneIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1F4E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  phoneInfoCol: {
    flex: 1,
  },
  phoneInfoLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  phoneInfoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statusVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  changeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A859',
    height: 48,
    borderRadius: 14,
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  changeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  unlinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    height: 48,
    borderRadius: 14,
  },
  unlinkBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Steps
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 10,
  },
  flagPrefixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    marginRight: 10,
    gap: 4,
  },
  flagText: {
    fontSize: 16,
  },
  prefixText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  otpInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 10,
  },
  otpTextInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 6,
    color: '#0F172A',
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#0369A1',
  },
  hintCodeBold: {
    fontWeight: 'bold',
    color: '#0284C7',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  primaryActionBtn: {
    backgroundColor: '#00A859',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  btnDisabled: {
    opacity: 0.55,
  },
  cancelLinkBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelLinkText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  // Danger Mode
  dangerWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#991B1B',
  },
  dangerSubtitle: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
    lineHeight: 16,
  },
  confirmPromptText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 10,
  },
  dangerActionBtn: {
    backgroundColor: '#DC2626',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 3,
  },
  dangerActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
