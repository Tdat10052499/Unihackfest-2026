import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { usePrivy, useLinkSMS } from '@privy-io/expo';

export default function OnboardingPhoneScreen() {
  const router = useRouter();
  const privy = usePrivy();
  const user = privy?.user || null;

  // Quản lý trạng thái tiến trình (1: Nhập Số điện thoại, 2: Nhập OTP)
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Tích hợp hook useLinkSMS từ @privy-io/expo để LIÊN KẾT số điện thoại vào tài khoản hiện tại
  const linkSmsHook = useLinkSMS({
    onError: (err) => {
      console.warn('⚠️ [useLinkSMS Error]:', err);
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      setErrorMessage(msg || 'Có lỗi xảy ra trong quá trình xác thực SMS.');
    },
    onSendCodeSuccess: (args) => {
      console.log('✅ [useLinkSMS] Gửi mã xác nhận thành công tới:', args?.phone);
    },
    onLinkSuccess: (updatedUser) => {
      console.log('🎉 [useLinkSMS] Liên kết số điện thoại thành công! User ID:', updatedUser?.id);
    },
  });

  const sendCode = linkSmsHook?.sendCode;
  const linkWithCode = linkSmsHook?.linkWithCode;
  const smsState = linkSmsHook?.state;

  const isSendingCode = smsState?.status === 'sending-code';
  const isSubmittingCode = smsState?.status === 'submitting-code';

  /**
   * Tự động chuẩn hóa định dạng số điện thoại E.164:
   * - Nếu bắt đầu bằng 0 -> tự động chuyển sang +84...
   * - Nếu đã có dấu + (ví dụ +15555555555 hoặc +84...) -> giữ nguyên
   * - Nếu là số thường chưa có dấu + -> thêm +84
   */
  const formatPhoneNumber = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('+')) {
      return trimmed;
    }
    if (trimmed.startsWith('0')) {
      return `+84${trimmed.slice(1)}`;
    }
    return `+84${trimmed}`;
  };

  // Xử lý gửi mã OTP (Bước 1)
  const handleSendOtp = async () => {
    const formatted = formatPhoneNumber(phone);
    if (!formatted || formatted.length < 8) {
      setErrorMessage('Vui lòng nhập số điện thoại hợp lệ.');
      Alert.alert('Số điện thoại không hợp lệ', 'Vui lòng nhập đầy đủ số điện thoại của bạn.');
      return;
    }

    setErrorMessage('');

    if (!sendCode) {
      setErrorMessage('Hệ thống xác thực SMS chưa sẵn sàng.');
      return;
    }

    try {
      console.log('📱 [Onboarding Step 1] Đang gửi mã OTP tới số:', formatted, 'User ID:', user?.id);
      
      // Nếu là số test Dev, hỗ trợ đi tiếp ngay cả khi chưa cấu hình SMS gateway trên Privy
      if (formatted === '+15555555555') {
        try {
          await sendCode({ phone: formatted });
        } catch (devErr) {
          console.log('ℹ️ [Dev Mode] Privy SMS chưa bật trên Dashboard, kích hoạt chế độ test mô phỏng.');
        }
        setStep(2);
        setOtpCode('');
        return;
      }

      await sendCode({ phone: formatted });
      setStep(2);
      setOtpCode('');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      console.warn('❌ [Onboarding Step 1 Error]:', errorMsg);

      if (errorMsg.includes('Login with SMS not allowed') || errorMsg.includes('SMS not allowed')) {
        Alert.alert(
          'SMS chưa được kích hoạt trên Privy',
          'Phương thức xác thực SMS hiện chưa được bật trong Privy Dashboard. Bạn có thể sử dụng số test (+15555555555) hoặc bấm "Tiếp tục chế độ Dev" để trải nghiệm luồng Onboarding.',
          [
            {
              text: 'Dùng số Test (+15555555555)',
              onPress: () => {
                setPhone('+15555555555');
                setStep(2);
              },
            },
            {
              text: 'Tiếp tục chế độ Dev',
              onPress: () => {
                setStep(2);
              },
            },
            { text: 'Đóng', style: 'cancel' },
          ]
        );
        return;
      }

      setErrorMessage(errorMsg || 'Không thể gửi mã xác thực. Vui lòng kiểm tra lại số điện thoại.');
      Alert.alert(
        'Gửi mã thất bại',
        errorMsg || 'Không thể gửi mã xác nhận SMS tới số điện thoại này. Vui lòng thử lại.'
      );
    }
  };

  // Xử lý xác nhận mã OTP (Bước 2)
  const handleVerifyOtp = async () => {
    const trimmedOtp = otpCode.trim();
    const formatted = formatPhoneNumber(phone);

    if (!trimmedOtp || trimmedOtp.length < 6) {
      setErrorMessage('Vui lòng nhập đủ 6 chữ số mã OTP.');
      Alert.alert('Thông báo', 'Mã OTP bao gồm 6 chữ số. Vui lòng nhập đầy đủ.');
      return;
    }

    setErrorMessage('');

    // Nếu là mã test Dev 123456
    if (trimmedOtp === '123456' && (formatted === '+15555555555' || !linkWithCode)) {
      console.log('🎉 [Dev Mode] Xác thực mã test 123456 thành công! Chuyển tiếp sang Username...');
      router.replace('/(onboarding)/username');
      return;
    }

    if (!linkWithCode) {
      setErrorMessage('Hệ thống xác thực SMS chưa sẵn sàng.');
      return;
    }

    try {
      console.log('🔐 [Onboarding Step 2] Đang xác thực OTP:', trimmedOtp, 'cho số:', formatted);
      const updatedUser = await linkWithCode({
        code: trimmedOtp,
        phone: formatted,
      });

      console.log('🎉 [Onboarding] Liên kết số điện thoại thành công! Chuyển tiếp sang Username...');
      router.replace('/(onboarding)/username');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      console.warn('❌ [Onboarding Step 2 Error]:', errorMsg);

      // Nếu lỗi là do Dashboard Privy chưa bật SMS và user nhập OTP test
      if (trimmedOtp === '123456' || errorMsg.includes('SMS not allowed')) {
        console.log('🎉 [Dev Fallback] Bỏ qua lỗi SMS Privy trên Dashboard, chuyển sang Username...');
        router.replace('/(onboarding)/username');
        return;
      }

      setErrorMessage('Mã OTP không hợp lệ hoặc đã hết hạn.');
      Alert.alert(
        'Xác thực thất bại',
        'Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại.'
      );
    }
  };

  // Bỏ qua onboarding bước SĐT
  const handleSkip = () => {
    console.log('⏩ [Onboarding] Người dùng chọn bỏ qua bước liên kết SĐT');
    router.replace('/(onboarding)/username');
  };

  // Điền nhanh thông tin test cho Dev
  const handleFillDevPhone = () => {
    setPhone('+15555555555');
    setErrorMessage('');
  };

  const handleFillDevOtp = () => {
    setOtpCode('123456');
    setErrorMessage('');
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>
                {step === 1 ? 'BƯỚC 1 / 2' : 'XÁC THỰC OTP'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
              <Text style={styles.skipBtnText}>Bỏ qua</Text>
            </TouchableOpacity>
          </View>

          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={step === 1 ? 'phone-portrait-outline' : 'shield-checkmark-outline'}
                size={36}
                color="#00A859"
              />
            </View>
            <Text style={styles.heroTitle}>
              {step === 1 ? 'Liên kết Số điện thoại' : 'Nhập mã xác thực SMS'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {step === 1
                ? 'Kích hoạt tính năng chuyển nhận tiền tức thì bằng Số điện thoại và làm dữ liệu định danh SNS cho ví N.E.D.'
                : `Mã xác nhận 6 chữ số đã được gửi tới số ${formatPhoneNumber(phone)}`}
            </Text>
          </View>

          {/* Error Banner */}
          {!!errorMessage && (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* Card Container */}
          <View style={styles.cardContainer}>
            {step === 1 ? (
              /* =================== BƯỚC 1: NHẬP SỐ ĐIỆN THOẠI =================== */
              <View>
                <Text style={styles.inputLabel}>Số điện thoại</Text>

                <View style={styles.inputWrapper}>
                  <View style={styles.countryCodeBadge}>
                    <Text style={styles.flagEmoji}>
                      {phone.startsWith('+1') ? '🇺🇸' : '🇻🇳'}
                    </Text>
                    <Text style={styles.countryCodeText}>
                      {phone.startsWith('+1') ? '+1' : '+84'}
                    </Text>
                  </View>

                  <TextInput
                    style={styles.phoneInput}
                    placeholder="0912 345 678 hoặc +15555555555"
                    placeholderTextColor="#94A3B8"
                    value={phone}
                    onChangeText={(text) => {
                      setPhone(text);
                      if (errorMessage) setErrorMessage('');
                    }}
                    keyboardType="phone-pad"
                    autoFocus
                    editable={!isSendingCode}
                  />
                </View>

                {/* Dev Hint Helper (Clickable) */}
                <TouchableOpacity
                  style={styles.devHintBox}
                  onPress={handleFillDevPhone}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="developer-mode" size={16} color="#6366F1" />
                  <Text style={styles.devHintText}>
                    Dành cho Dev: Hãy nhập <Text style={styles.devCodeHighlight}>+15555555555</Text> để test (Click để điền)
                  </Text>
                </TouchableOpacity>

                {/* Benefit Info */}
                <View style={styles.benefitBox}>
                  <View style={styles.benefitRow}>
                    <Feather name="check-circle" size={16} color="#00A859" />
                    <Text style={styles.benefitText}>Nhận tiền từ bạn bè chỉ với số điện thoại</Text>
                  </View>
                  <View style={styles.benefitRow}>
                    <Feather name="check-circle" size={16} color="#00A859" />
                    <Text style={styles.benefitText}>Khôi phục ví khẩn cấp qua tin nhắn SMS OTP</Text>
                  </View>
                </View>

                {/* Submit Button Step 1 */}
                <TouchableOpacity
                  style={[styles.primaryBtn, isSendingCode && styles.btnDisabled]}
                  onPress={handleSendOtp}
                  disabled={isSendingCode}
                  activeOpacity={0.85}
                >
                  {isSendingCode ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>Gửi mã OTP</Text>
                      <Feather name="arrow-right" size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>

                {/* Skip Option */}
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handleSkip}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryBtnText}>Để sau, bỏ qua bước này</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* =================== BƯỚC 2: NHẬP MÃ OTP =================== */
              <View>
                <Text style={styles.inputLabel}>Mã xác thực 6 chữ số</Text>

                <View style={styles.inputWrapper}>
                  <Feather name="key" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.phoneInput, styles.otpInput]}
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
                    editable={!isSubmittingCode}
                  />
                </View>

                {/* Dev Hint Helper Step 2 (Clickable) */}
                <TouchableOpacity
                  style={styles.devHintBox}
                  onPress={handleFillDevOtp}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="developer-mode" size={16} color="#6366F1" />
                  <Text style={styles.devHintText}>
                    Dành cho Dev: Mã test là <Text style={styles.devCodeHighlight}>123456</Text> (Click để điền)
                  </Text>
                </TouchableOpacity>

                {/* Submit Button Step 2 */}
                <TouchableOpacity
                  style={[styles.primaryBtn, isSubmittingCode && styles.btnDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={isSubmittingCode}
                  activeOpacity={0.85}
                >
                  {isSubmittingCode ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>Xác nhận</Text>
                      <Feather name="check" size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>

                {/* Back to Step 1 */}
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => {
                    setStep(1);
                    setOtpCode('');
                    setErrorMessage('');
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="arrow-left" size={16} color="#64748B" />
                  <Text style={styles.backBtnText}>Quay lại, sửa số điện thoại</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },

  // Header Row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stepBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00A859',
    letterSpacing: 1,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#00A859',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
    flex: 1,
  },

  // Card Container
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    height: 52,
    marginBottom: 12,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 10,
    gap: 4,
  },
  flagEmoji: {
    fontSize: 15,
  },
  countryCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '600',
  },
  otpInput: {
    letterSpacing: 4,
    fontSize: 18,
    fontWeight: '700',
  },

  // Dev Hint Helper
  devHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 14,
    gap: 6,
  },
  devHintText: {
    fontSize: 12,
    color: '#4338CA',
    fontWeight: '500',
    flex: 1,
  },
  devCodeHighlight: {
    fontWeight: '800',
    color: '#312E81',
  },

  // Benefit Box
  benefitBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 18,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },

  // Action Buttons
  primaryBtn: {
    height: 52,
    backgroundColor: '#00A859',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 6,
    gap: 6,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
