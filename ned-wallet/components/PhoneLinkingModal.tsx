import React, { useState } from 'react';
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
import { linkPhoneNumber } from '../services/supabase';
import { setLinkedPhone, setHasSkippedPhoneLink } from '../services/storage';

interface PhoneLinkingModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  walletAddress: string;
  onLinkSuccess?: (phoneNumber: string) => void;
}

export const PhoneLinkingModal: React.FC<PhoneLinkingModalProps> = ({
  visible,
  onClose,
  userId,
  walletAddress,
  onLinkSuccess,
}) => {
  const [step, setStep] = useState<'PHONE_INPUT' | 'OTP_VERIFICATION'>('PHONE_INPUT');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Xử lý gửi mã OTP (Bước 1 -> Bước 2)
  const handleRequestOtp = () => {
    const trimmed = phone.trim().replace(/[^\d+]/g, '');
    if (!trimmed || trimmed.length < 9) {
      setErrorMessage('Vui lòng nhập số điện thoại hợp lệ (tối thiểu 9 số).');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);

    // Mô phỏng độ trễ gửi SMS OTP
    setTimeout(() => {
      setIsLoading(false);
      setStep('OTP_VERIFICATION');
    }, 600);
  };

  // Xử lý xác thực Mock OTP (Bước 2)
  const handleVerifyOtp = async () => {
    const trimmedCode = otpCode.trim();
    if (!trimmedCode) {
      setErrorMessage('Vui lòng nhập mã OTP 6 chữ số.');
      return;
    }

    // Logic Mock OTP: Mã chính xác là 123456
    if (trimmedCode !== '123456') {
      setErrorMessage('Mã OTP không hợp lệ. Vui lòng thử lại (Gợi ý: 123456).');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      // 1. Ghi nhận lên Supabase bảng phone_wallets (UPSERT)
      const res = await linkPhoneNumber(userId, walletAddress, phone);

      if (!res.success) {
        setIsLoading(false);
        Alert.alert('Liên kết thất bại ❌', res.error || 'Không thể liên kết số điện thoại này vào hệ thống.');
        return;
      }

      // 2. Chỉ khi thành công mới lưu vào AsyncStorage local cache và cập nhật UI
      await setLinkedPhone(phone.trim());

      setIsLoading(false);
      onClose();

      if (onLinkSuccess) {
        onLinkSuccess(phone.trim());
      }

      Alert.alert(
        'Liên Kết Thành Công! 🎉',
        `Số điện thoại ${phone} đã được liên kết với ví Solana của bạn. Bạn bè có thể chuyển tiền trực tiếp qua số điện thoại này.`
      );
    } catch (err: any) {
      setIsLoading(false);
      console.error('Error in phone linking verify:', err);
      Alert.alert('Lỗi', err?.message || 'Không thể liên kết số điện thoại lúc này.');
    }
  };

  // Xử lý khi người dùng bấm "Bỏ qua" (Skip)
  const handleSkip = async () => {
    try {
      await setHasSkippedPhoneLink();
    } catch (e) {
      console.log('Skip error:', e);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleSkip}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropDismissArea}
          activeOpacity={1}
          onPress={handleSkip}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.bottomSheetContainer}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              {/* Header Icon & Branding */}
              <View style={styles.bannerRow}>
                <View style={styles.iconCircle}>
                  <Feather name="smartphone" size={26} color="#00A859" />
                </View>
                <TouchableOpacity style={styles.skipTopBtn} onPress={handleSkip}>
                  <Text style={styles.skipTopBtnText}>Bỏ qua</Text>
                </TouchableOpacity>
              </View>

              {step === 'PHONE_INPUT' ? (
                // BƯỚC 1: NHẬP SỐ ĐIỆN THOẠI
                <View style={styles.stepBox}>
                  <Text style={styles.sheetTitle}>Liên kết Số điện thoại</Text>
                  <Text style={styles.sheetSubtitle}>
                    Nhận tiền mã hóa tức thì qua số điện thoại mà không cần nhớ địa chỉ ví dài phức tạp.
                  </Text>

                  {/* Input Phone */}
                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Số điện thoại của bạn</Text>
                    <View style={styles.phoneInputWrapper}>
                      <View style={styles.flagPrefixBox}>
                        <Text style={styles.flagText}>🇻🇳</Text>
                        <Text style={styles.prefixText}>+84</Text>
                      </View>
                      <TextInput
                        style={styles.phoneTextInput}
                        placeholder="0912 345 678"
                        placeholderTextColor="#94A3B8"
                        value={phone}
                        onChangeText={(text) => {
                          setPhone(text);
                          if (errorMessage) setErrorMessage('');
                        }}
                        keyboardType="phone-pad"
                        autoFocus
                      />
                    </View>
                  </View>

                  {errorMessage ? (
                    <View style={styles.errorBox}>
                      <Feather name="alert-circle" size={15} color="#DC2626" style={{ marginRight: 6 }} />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  ) : null}

                  {/* Nút Nhận mã OTP */}
                  <TouchableOpacity
                    style={[styles.primaryBtn, (!phone.trim() || isLoading) && styles.btnDisabled]}
                    onPress={handleRequestOtp}
                    disabled={!phone.trim() || isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Nhận mã OTP</Text>
                    )}
                  </TouchableOpacity>

                  {/* Nút Bỏ qua dưới cùng */}
                  <TouchableOpacity style={styles.skipBottomBtn} onPress={handleSkip}>
                    <Text style={styles.skipBottomText}>Để sau, tôi sẽ liên kết sau</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // BƯỚC 2: MOCK OTP (Nhập 123456)
                <View style={styles.stepBox}>
                  <Text style={styles.sheetTitle}>Nhập mã xác nhận OTP</Text>
                  <Text style={styles.sheetSubtitle}>
                    Mã 6 chữ số thử nghiệm đã gửi tới{' '}
                    <Text style={styles.highlightPhone}>{phone}</Text>
                  </Text>

                  {/* Hint Mock OTP Box */}
                  <View style={styles.hintCard}>
                    <Ionicons name="information-circle-outline" size={18} color="#0284C7" />
                    <Text style={styles.hintText}>
                      Mã xác thực thử nghiệm: <Text style={styles.hintCodeBold}>123456</Text>
                    </Text>
                  </View>

                  {/* Input OTP */}
                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Mã xác thực (6 số)</Text>
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
                  </View>

                  {errorMessage ? (
                    <View style={styles.errorBox}>
                      <Feather name="alert-circle" size={15} color="#DC2626" style={{ marginRight: 6 }} />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  ) : null}

                  {/* Nút Xác nhận */}
                  <TouchableOpacity
                    style={[styles.primaryBtn, (!otpCode.trim() || isLoading) && styles.btnDisabled]}
                    onPress={handleVerifyOtp}
                    disabled={!otpCode.trim() || isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Xác nhận & Hoàn tất</Text>
                    )}
                  </TouchableOpacity>

                  {/* Nút Quay lại sửa SĐT */}
                  <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => {
                      setStep('PHONE_INPUT');
                      setOtpCode('');
                      setErrorMessage('');
                    }}
                  >
                    <Feather name="arrow-left" size={15} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.backBtnText}>Quay lại sửa số điện thoại</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D1F4E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipTopBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  skipTopBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  stepBox: {
    width: '100%',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 6,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 18,
  },
  highlightPhone: {
    color: '#00A859',
    fontWeight: '700',
  },
  inputSection: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 52,
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
  phoneTextInput: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '600',
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
    marginBottom: 14,
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
    paddingVertical: 4,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  primaryBtn: {
    backgroundColor: '#00A859',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  skipBottomBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  skipBottomText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  backBtnText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
});
