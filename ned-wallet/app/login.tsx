import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  usePrivy,
  useLoginWithOAuth,
  useLoginWithEmail,
} from '@privy-io/expo';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { WalletSelectorModal } from '../src/components/WalletSelectorModal';
import { PhantomAuthButton } from '../components/PhantomAuthButton';

export default function LoginScreen() {
  const router = useRouter();

  const privy = usePrivy();
  const isReady = privy?.isReady ?? false;
  const user = privy?.user ?? null;

  // State quản lý email OTP & các bước
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'INITIAL' | 'OTP_VERIFICATION'>('INITIAL');
  const [errorMessage, setErrorMessage] = useState('');
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);

  // Hook Privy Google OAuth
  const oAuthHook = useLoginWithOAuth({
    onError: (err) => {
      console.error('Google OAuth Error:', err);
      Alert.alert(
        'Đăng nhập thất bại',
        err?.message || 'Không thể đăng nhập bằng tài khoản Google. Vui lòng thử lại.'
      );
    },
    onSuccess: (u) => {
      console.log('Google OAuth Success for user:', u?.id);
    },
  });
  const loginWithOAuth = oAuthHook?.login;
  const oAuthState = oAuthHook?.state;

  // Hook Privy Email OTP
  const emailHook = useLoginWithEmail({
    onError: (err) => {
      console.error('Email Login Error:', err);
      setErrorMessage(err?.message || 'Không thể xử lý yêu cầu email. Vui lòng thử lại.');
    },
    onLoginSuccess: (u) => {
      console.log('Email Login Success for user:', u?.id);
    },
  });
  const sendCode = emailHook?.sendCode;
  const loginWithCode = emailHook?.loginWithCode;
  const emailState = emailHook?.state;

  // Tự động chuyển hướng vào màn hình Home khi đã đăng nhập
  useEffect(() => {
    if (isReady && user) {
      router.replace('/');
    }
  }, [isReady, user, router]);

  // Xử lý gửi mã xác nhận OTP qua Email
  const handleSendEmailCode = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    setErrorMessage('');
    if (!sendCode) {
      setErrorMessage('Hệ thống xác thực chưa sẵn sàng. Vui lòng thử lại sau.');
      return;
    }
    try {
      await sendCode({ email: trimmedEmail });
      setStep('OTP_VERIFICATION');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.log('Error sending email code:', msg);
      setErrorMessage(msg || 'Không thể gửi mã xác nhận.');
    }
  };

  // Xử lý xác thực mã OTP
  const handleVerifyOtp = async () => {
    const trimmedCode = otpCode.trim();
    const trimmedEmail = email.trim();
    if (!trimmedCode) {
      setErrorMessage('Vui lòng nhập mã OTP 6 chữ số.');
      return;
    }
    setErrorMessage('');
    if (!loginWithCode) {
      setErrorMessage('Hệ thống xác thực chưa sẵn sàng. Vui lòng thử lại sau.');
      return;
    }
    try {
      await loginWithCode({ code: trimmedCode, email: trimmedEmail });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.log('Error verifying OTP code:', msg);
      setErrorMessage(msg || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
    }
  };

  // Xử lý đăng nhập Google
  const handleGoogleLogin = async () => {
    setErrorMessage('');
    if (!loginWithOAuth) {
      Alert.alert('Chưa sẵn sàng', 'Hệ thống đăng nhập Google đang khởi động.');
      return;
    }
    try {
      await loginWithOAuth({ provider: 'google' });
    } catch (err: unknown) {
      console.log('Error triggering Google login:', err instanceof Error ? err.message : JSON.stringify(err));
    }
  };

  const isGoogleLoading = oAuthState?.status === 'loading';
  const isSendingEmail = emailState?.status === 'sending-code';
  const isSubmittingOtp = emailState?.status === 'submitting-code';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. Phần Thương Hiệu & Logo N.E.D */}
          <View style={styles.headerSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>Đ</Text>
            </View>
            <Text style={styles.appTitle}>N.E.D</Text>
            <Text style={styles.appSubtitle}>NorthAxis Electronic Dollars</Text>
            <Text style={styles.appTagline}>
              Thanh toán vi mô tức thì chuẩn Solana Pay & MiniPay
            </Text>

            {/* Feature Pills */}
            <View style={styles.featuresRow}>
              <View style={styles.featurePill}>
                <Feather name="zap" size={13} color="#00A859" />
                <Text style={styles.featurePillText}>Tốc độ tức thì</Text>
              </View>
              <View style={styles.featurePill}>
                <Feather name="shield" size={13} color="#00A859" />
                <Text style={styles.featurePillText}>Ví ngầm an toàn</Text>
              </View>
            </View>
          </View>

          {/* 2. Form Xác Thực (Bước 1: Email & Google, Bước 2: Nhập OTP) */}
          <View style={styles.formCard}>
            {step === 'INITIAL' ? (
              // BƯỚC 1: Nhập Email hoặc chọn Google
              <View style={styles.stepContainer}>
                <Text style={styles.inputLabel}>Địa chỉ Email</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="mail" size={18} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="vidu@domain.com"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errorMessage) setErrorMessage('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                {/* Nút Tiếp tục với Email */}
                <TouchableOpacity
                  style={[
                    styles.primaryGreenBtn,
                    (isSendingEmail || !email.trim()) && styles.btnDisabled,
                  ]}
                  onPress={handleSendEmailCode}
                  disabled={isSendingEmail || !email.trim()}
                  activeOpacity={0.85}
                >
                  {isSendingEmail ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryGreenBtnText}>Tiếp tục với Email</Text>
                  )}
                </TouchableOpacity>

                {/* Dòng phân cách "Hoặc" */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Hoặc</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Nút Tiếp tục với Google */}
                <TouchableOpacity
                  style={[
                    styles.googleLoginBtn,
                    isGoogleLoading && styles.googleLoginBtnDisabled,
                  ]}
                  onPress={handleGoogleLogin}
                  disabled={isGoogleLoading}
                  activeOpacity={0.85}
                >
                  {isGoogleLoading ? (
                    <ActivityIndicator size="small" color="#00A859" />
                  ) : (
                    <View style={styles.googleBtnInner}>
                      <View style={styles.googleIconBox}>
                        <Ionicons name="logo-google" size={20} color="#4285F4" />
                      </View>
                      <Text style={styles.googleBtnText}>Tiếp tục với Google</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Nút Đăng nhập bằng ví Phantom (Đóng gói độc lập trong PhantomAuthButton) */}
                <PhantomAuthButton mode="login" />
              </View>
            ) : (
              // BƯỚC 2: Xác minh mã OTP
              <View style={styles.stepContainer}>
                <View style={styles.otpHeader}>
                  <Text style={styles.otpTitle}>Nhập mã xác nhận</Text>
                  <Text style={styles.otpSubtitle}>
                    Mã xác minh 6 chữ số đã được gửi tới{' '}
                    <Text style={styles.otpEmailHighlight}>{email}</Text>
                  </Text>
                </View>

                <View style={styles.inputWrapper}>
                  <Feather name="key" size={18} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, styles.otpTextInput]}
                    placeholder="Nhập 6 chữ số OTP"
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

                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                {/* Nút Xác nhận OTP */}
                <TouchableOpacity
                  style={[
                    styles.primaryGreenBtn,
                    (isSubmittingOtp || !otpCode.trim()) && styles.btnDisabled,
                  ]}
                  onPress={handleVerifyOtp}
                  disabled={isSubmittingOtp || !otpCode.trim()}
                  activeOpacity={0.85}
                >
                  {isSubmittingOtp ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryGreenBtnText}>Xác nhận & Đăng nhập</Text>
                  )}
                </TouchableOpacity>

                {/* Nút Quay lại */}
                <TouchableOpacity
                  style={styles.backLinkBtn}
                  onPress={() => {
                    setStep('INITIAL');
                    setOtpCode('');
                    setErrorMessage('');
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="arrow-left" size={15} color="#64748B" />
                  <Text style={styles.backLinkText}>Quay lại nhập email khác</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 3. Footer Điều khoản & Reset */}
          <View style={styles.footerSection}>
            <Text style={styles.footerTermsText}>
              Bằng việc đăng nhập, bạn đồng ý với{' '}
              <Text style={styles.termsLink}>Điều khoản sử dụng</Text> và{' '}
              <Text style={styles.termsLink}>Chính sách bảo mật</Text> của N.E.D.
            </Text>

            <TouchableOpacity
              style={{ marginTop: 16, alignItems: 'center' }}
              onPress={async () => {
                try {
                  const { executeHardReset } = await import('../services/storage');
                  await executeHardReset();
                  Alert.alert('Đã Dọn Dẹp 🎉', 'Đã xóa sạch dữ liệu đệm và làm mới phiên.');
                } catch (e) {
                  console.log(e);
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 12, color: '#94A3B8', textDecorationLine: 'underline' }}>
                Khắc phục sự cố: Dọn dẹp bộ nhớ phiên (Reset Cache)
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Lựa Chọn Ví Solana (Phantom, Solflare, Backpack, MWA) */}
      <WalletSelectorModal
        visible={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnected={() => {
          setShowWalletModal(false);
          router.replace('/');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },

  // Header Branding
  headerSection: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#00A859',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
    marginBottom: 14,
  },
  logoText: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1.5,
  },
  appSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00A859',
    marginTop: 2,
  },
  appTagline: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280,
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 5,
  },
  featurePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },

  // Form Card
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginVertical: 10,
  },
  stepContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
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
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  otpTextInput: {
    letterSpacing: 3,
    fontWeight: '600',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16,
  },

  // Primary Button (Email / OTP)
  primaryGreenBtn: {
    backgroundColor: '#00A859',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryGreenBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.65,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },

  // Google Login Button
  googleLoginBtn: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  googleLoginBtnDisabled: {
    opacity: 0.7,
  },
  googleBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleIconBox: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },

  // Wallet Login Button
  walletLoginBtn: {
    height: 52,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  walletBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  walletIconBox: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4338CA',
  },

  // OTP Step Styles
  otpHeader: {
    marginBottom: 16,
  },
  otpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  otpSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  otpEmailHighlight: {
    fontWeight: '700',
    color: '#00A859',
  },
  backLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 6,
    gap: 6,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },

  // Footer Terms
  footerSection: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerTermsText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  termsLink: {
    color: '#00A859',
    fontWeight: '600',
  },
});
