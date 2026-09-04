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
import { PhantomAuthButton } from '../../components/PhantomAuthButton';

export default function AuthGatewayScreen() {
  const router = useRouter();

  const privy = usePrivy();
  const isReady = privy?.isReady ?? false;
  const user = privy?.user ?? null;

  // State chuyển đổi chế độ Đăng nhập / Đăng ký
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true);

  // State quản lý email OTP & các bước
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'INITIAL' | 'OTP_VERIFICATION'>('INITIAL');
  const [errorMessage, setErrorMessage] = useState('');

  // Hook Privy Google OAuth
  const oAuthHook = useLoginWithOAuth({
    onError: (err) => {
      console.error('Google OAuth Error:', err);
      Alert.alert(
        isLoginMode ? 'Đăng nhập thất bại' : 'Đăng ký thất bại',
        err?.message || 'Không thể xác thực bằng tài khoản Google. Vui lòng thử lại.'
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
      console.error('Email Auth Error:', err);
      setErrorMessage(err?.message || 'Không thể xử lý yêu cầu email. Vui lòng thử lại.');
    },
    onLoginSuccess: (u) => {
      console.log('Email Auth Success for user:', u?.id);
    },
  });
  const sendCode = emailHook?.sendCode;
  const loginWithCode = emailHook?.loginWithCode;
  const emailState = emailHook?.state;

  // Tự động chuyển hướng vào màn hình Home khi đã xác thực thành công
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

  // Xử lý đăng nhập / đăng ký Google
  const handleGoogleLogin = async () => {
    setErrorMessage('');
    if (!loginWithOAuth) {
      Alert.alert('Chưa sẵn sàng', 'Hệ thống xác thực Google đang khởi động.');
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
          {/* Top Brand Banner */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Ionicons name="shield-checkmark" size={28} color="#00A859" />
            </View>
            <Text style={styles.brandTitle}>N.E.D WALLET</Text>
            <Text style={styles.brandSubtitle}>
              Ví Solana Thông Minh & Bảo Mật Tuyệt Đối
            </Text>
          </View>

          {/* Auth Card Container */}
          <View style={styles.authCard}>
            {/* Mode Switcher Tabs (Đăng Nhập | Đăng Ký) */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, isLoginMode && styles.tabButtonActive]}
                onPress={() => {
                  setIsLoginMode(true);
                  setErrorMessage('');
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, isLoginMode && styles.tabTextActive]}>
                  Đăng Nhập
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, !isLoginMode && styles.tabButtonActive]}
                onPress={() => {
                  setIsLoginMode(false);
                  setErrorMessage('');
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, !isLoginMode && styles.tabTextActive]}>
                  Đăng Ký
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message Banner */}
            {!!errorMessage && (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {step === 'INITIAL' ? (
              /* Bước 1: Nhập Email & Lựa chọn phương thức xác thực */
              <View style={styles.formSection}>
                {/* Tiêu đề biểu mẫu */}
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>
                    {isLoginMode ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}
                  </Text>
                  <Text style={styles.formSubtitle}>
                    {isLoginMode
                      ? 'Đăng nhập vào ví N.E.D của bạn'
                      : 'Bắt đầu trải nghiệm Web3 không cần Seedphrase'}
                  </Text>
                </View>

                {/* Email Input Field */}
                <View style={styles.inputGroup}>
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
                      editable={!isSendingEmail}
                    />
                  </View>
                </View>

                {/* Email Submit Button */}
                <TouchableOpacity
                  style={[styles.primaryBtn, isSendingEmail && styles.primaryBtnDisabled]}
                  onPress={handleSendEmailCode}
                  disabled={isSendingEmail}
                  activeOpacity={0.85}
                >
                  {isSendingEmail ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {isLoginMode ? 'Tiếp tục với Email' : 'Đăng ký với Email'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>hoặc tiếp tục với</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* OAuth: Google Button */}
                <TouchableOpacity
                  style={[styles.googleLoginBtn, isGoogleLoading && styles.googleLoginBtnDisabled]}
                  onPress={handleGoogleLogin}
                  disabled={isGoogleLoading}
                  activeOpacity={0.85}
                >
                  {isGoogleLoading ? (
                    <ActivityIndicator size="small" color="#4285F4" />
                  ) : (
                    <View style={styles.googleBtnInner}>
                      <View style={styles.googleIconBox}>
                        <Ionicons name="logo-google" size={20} color="#4285F4" />
                      </View>
                      <Text style={styles.googleBtnText}>Tiếp tục với Google</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Web3 Auth: Phantom Auth Button (Encapsulated Component) */}
                <PhantomAuthButton mode={isLoginMode ? 'login' : 'signup'} />
              </View>
            ) : (
              /* Bước 2: Xác thực mã OTP qua Email */
              <View style={styles.formSection}>
                <View style={styles.otpHeader}>
                  <Text style={styles.otpTitle}>Nhập mã xác thực</Text>
                  <Text style={styles.otpSubtitle}>
                    Mã 6 chữ số đã được gửi tới{' '}
                    <Text style={styles.otpEmailHighlight}>{email}</Text>
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mã xác thực OTP</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="key" size={18} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, styles.otpInput]}
                      placeholder="123456"
                      placeholderTextColor="#94A3B8"
                      value={otpCode}
                      onChangeText={(text) => {
                        setOtpCode(text);
                        if (errorMessage) setErrorMessage('');
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!isSubmittingOtp}
                      autoFocus
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, isSubmittingOtp && styles.primaryBtnDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={isSubmittingOtp}
                  activeOpacity={0.85}
                >
                  {isSubmittingOtp ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Xác nhận & Đăng nhập</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backLinkBtn}
                  onPress={() => {
                    setStep('INITIAL');
                    setOtpCode('');
                    setErrorMessage('');
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="arrow-left" size={16} color="#64748B" />
                  <Text style={styles.backLinkText}>Đổi địa chỉ email khác</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Footer Terms */}
          <View style={styles.footerSection}>
            <Text style={styles.footerTermsText}>
              Bằng việc tiếp tục, bạn đồng ý với{' '}
              <Text style={styles.termsLink}>Điều khoản dịch vụ</Text> và{' '}
              <Text style={styles.termsLink}>Chính sách bảo mật</Text> của N.E.D Wallet.
            </Text>
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
    paddingBottom: 24,
    justifyContent: 'center',
  },

  // Brand Header
  brandHeader: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#00A859',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },

  // Auth Card
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },

  // Tabs (Đăng Nhập | Đăng Ký)
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  // Form Section
  formSection: {
    width: '100%',
  },
  formHeader: {
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  formSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
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
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
    flex: 1,
  },

  // Input Group
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  otpInput: {
    fontSize: 18,
    letterSpacing: 4,
    fontWeight: '700',
  },

  // Primary Action Button
  primaryBtn: {
    height: 50,
    backgroundColor: '#00A859',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
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
    paddingVertical: 16,
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
