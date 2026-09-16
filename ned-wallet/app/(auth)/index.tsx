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
  Image,
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

// Component đục lỗ cuống vé
const TicketCutout = ({ size, left, right, bottomOffset = -4 }: { size: number, left?: number | string, right?: number | string, bottomOffset?: number }) => {
  return (
    <View style={{
      position: 'absolute',
      bottom: bottomOffset,
      ...(left !== undefined ? { left } : {}),
      ...(right !== undefined ? { right } : {}),
      width: size,
      height: size / 2 + 5, // Thêm 5px để che luôn phần bóng đổ bên dưới
      overflow: 'hidden',
      zIndex: 10,
    }}>
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FDF8F5',
        borderWidth: 3,
        borderColor: '#000',
      }} />
      <View style={{
        position: 'absolute',
        top: size / 2,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FDF8F5',
      }} />
    </View>
  );
};

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

  // Hàm điều hướng tập trung áp dụng thống nhất cho mọi phương thức (Email, Google, Phantom SIWS)
  const handleAuthSuccess = (
    authUser?: any,
    isNewUser?: boolean,
    wasAlreadyAuthenticated?: boolean
  ) => {
    console.log(
      '🎉 [Auth Gateway] Xác thực thành công! User:',
      authUser?.id,
      '| isNewUser:',
      isNewUser,
      '| wasAlreadyAuthenticated:',
      wasAlreadyAuthenticated
    );

    if (isNewUser) {
      router.replace('/(onboarding)/phone');
    } else {
      router.replace('/home');
    }
  };

  // Hook Privy Google OAuth
  const oAuthHook = useLoginWithOAuth({
    onError: (err) => {
      console.error('Google OAuth Error:', err);
      Alert.alert(
        isLoginMode ? 'Đăng nhập thất bại' : 'Đăng ký thất bại',
        err?.message || 'Không thể xác thực bằng tài khoản Google. Vui lòng thử lại.'
      );
    },
    onSuccess: (u, isNew) => {
      console.log('Google OAuth Success for user:', u?.id, 'isNew:', isNew);
      handleAuthSuccess(u, isNew ?? !isLoginMode, false);
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
    onLoginSuccess: (u, isNew) => {
      console.log('Email Auth Success for user:', u?.id, 'isNew:', isNew);
      handleAuthSuccess(u, isNew ?? !isLoginMode, false);
    },
  });
  const sendCode = emailHook?.sendCode;
  const loginWithCode = emailHook?.loginWithCode;
  const emailState = emailHook?.state;

  // Tự động chuyển hướng vào màn hình Home khi đã xác thực từ trước
  useEffect(() => {
    if (isReady && user) {
      console.log('🔄 [Auth Gateway] Đã có phiên đăng nhập trước đó:', user.id);
      handleAuthSuccess(user, false, true);
    }
  }, [isReady, user]);

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
      <StatusBar barStyle="dark-content" backgroundColor="#FDF8F5" />

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
              <Image 
                source={require('../../assets/images/mascot-sleepy.png')} 
                style={styles.mascotImage} 
                resizeMode="contain" 
              />
            </View>
            <Text style={styles.brandTitle}>N.E.D WALLET</Text>
            <Text style={styles.brandSubtitle}>
              Ví Solana Thông Minh & Bảo Mật Tuyệt Đối
            </Text>
          </View>

          {/* Ticket Wrapper */}
          <View style={styles.ticketWrapper}>
            {/* Ticket Shadow */}
            <View style={styles.ticketShadow} />

            {/* Ticket Body */}
            <View style={styles.ticketBody}>
              {/* Mode Switcher Tabs */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tabButton, isLoginMode && styles.tabButtonActive]}
                  onPress={() => {
                    setIsLoginMode(true);
                    setErrorMessage('');
                  }}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.tabText, isLoginMode && styles.tabTextActive]}>
                    Đăng nhập
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabButton, !isLoginMode && styles.tabButtonActive]}
                  onPress={() => {
                    setIsLoginMode(false);
                    setErrorMessage('');
                  }}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.tabText, !isLoginMode && styles.tabTextActive]}>
                    Đăng ký
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
                /* Bước 1: Nhập Email & Lựa chọn phương thức */
                <View style={styles.formSection}>
                  <View style={styles.formHeader}>
                    <Text style={styles.formTitle}>
                      {isLoginMode ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}
                    </Text>
                    <Text style={styles.formSubtitle}>
                      {isLoginMode
                        ? 'Đăng nhập vào ví N.E.D của bạn'
                        : 'Bắt đầu trải nghiệm Web3 cần Seedphrase'}
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Địa chỉ Email</Text>
                    <View style={styles.inputWrapper}>
                      <Feather name="mail" size={18} color="#000" style={styles.inputIcon} />
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

                  <TouchableOpacity
                    style={[styles.primaryBtn, isSendingEmail && styles.primaryBtnDisabled]}
                    onPress={handleSendEmailCode}
                    disabled={isSendingEmail}
                    activeOpacity={0.85}
                  >
                    <View style={styles.primaryBtnShadow} />
                    <View style={styles.primaryBtnBody}>
                      {isSendingEmail ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.primaryBtnText}>
                          {isLoginMode ? 'Tiếp tục với Email' : 'Đăng ký với Email'}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>hoặc tiếp tục với</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    style={[styles.socialBtnWrapper, isGoogleLoading && styles.primaryBtnDisabled]}
                    onPress={handleGoogleLogin}
                    disabled={isGoogleLoading}
                    activeOpacity={0.85}
                  >
                    <View style={styles.socialBtnShadow} />
                    <View style={styles.socialBtnBody}>
                      {isGoogleLoading ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <View style={styles.socialBtnInner}>
                          <Image source={{uri: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg'}} style={{width: 20, height: 20}} />
                          {/* Fallback to simple icon since remote SVG requires extra config sometimes */}
                          <Ionicons name="logo-google" size={20} color="#EA4335" />
                          <Text style={styles.socialBtnText}>
                            {isLoginMode ? 'Tiếp tục với Google' : 'Đăng ký với Google'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.phantomWrapper}>
                    <PhantomAuthButton
                      mode={isLoginMode ? 'login' : 'signup'}
                      onSuccess={(u, isNew) => handleAuthSuccess(u, isNew, false)}
                      onComplete={(u, isNew, wasAuth) => handleAuthSuccess(u, isNew, wasAuth)}
                    />
                  </View>
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
                      <Feather name="key" size={18} color="#000" style={styles.inputIcon} />
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
                    <View style={styles.primaryBtnShadow} />
                    <View style={styles.primaryBtnBody}>
                      {isSubmittingOtp ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.primaryBtnText}>Xác nhận & Đăng nhập</Text>
                      )}
                    </View>
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
                    <Feather name="arrow-left" size={16} color="#000" />
                    <Text style={styles.backLinkText}>Đổi địa chỉ email khác</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Footer Terms */}
              <View style={styles.footerSection}>
                <Text style={styles.footerTermsText}>
                  Bằng việc tiếp tục, bạn đồng ý với{' '}
                  <Text style={styles.termsLink}>Điều khoản dịch vụ</Text> và{' '}
                  <Text style={styles.termsLink}>Chính sách bảo mật</Text>
                </Text>
              </View>
            </View>

            {/* Cutouts (Lỗ đục cuống vé) */}
            <TicketCutout size={28} left={30} />
            <TicketCutout size={44} left="44%" right="44%" bottomOffset={-5} />
            <TicketCutout size={28} right={30} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FDF8F5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },

  // Brand Header
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FDE68A', // Vàng pastel
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  mascotImage: {
    width: 90,
    height: 90,
    marginTop: 15,
  },
  brandTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Black',
    color: '#000',
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#333',
    marginTop: 4,
    fontWeight: '600',
  },

  // Ticket Wrapper
  ticketWrapper: {
    width: '100%',
    position: 'relative',
    paddingBottom: 10,
  },
  ticketShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: '#000',
    borderRadius: 16,
  },
  ticketBody: {
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 16,
    padding: 20,
    paddingBottom: 30, // Chừa khoảng trống cho đục lỗ
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 999,
    padding: 2,
    marginBottom: 24,
    backgroundColor: '#FFF',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: '#8B5CF6', // Tím
    borderColor: '#000',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Black',
    color: '#000',
  },
  tabTextActive: {
    color: '#FFF',
  },

  // Form Section
  formSection: {
    width: '100%',
  },
  formHeader: {
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Black',
    color: '#000',
  },
  formSubtitle: {
    fontSize: 13,
    color: '#555',
    marginTop: 6,
    fontWeight: '500',
  },

  // Input Group
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Black',
    color: '#000',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF8F5', // Kem nhạt
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000',
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#000',
    fontWeight: '600',
  },
  otpInput: {
    fontSize: 18,
    letterSpacing: 4,
    fontWeight: '700',
  },

  // Primary Action Button (Email)
  primaryBtn: {
    width: '100%',
    height: 52,
    position: 'relative',
    marginTop: 8,
  },
  primaryBtnShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: -2,
    bottom: -2,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  primaryBtnBody: {
    width: '100%',
    height: '100%',
    backgroundColor: '#06B6D4', // Cyan
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: 'Inter-Black',
    color: '#FFF',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#000',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#000',
    fontWeight: '700',
  },

  // Social Buttons
  socialBtnWrapper: {
    width: '100%',
    height: 52,
    position: 'relative',
    marginBottom: 16,
  },
  socialBtnShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: -2,
    bottom: -2,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  socialBtnBody: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  socialBtnText: {
    fontSize: 14,
    fontFamily: 'Inter-Black',
    color: '#000',
  },
  phantomWrapper: {
    // The PhantomAuthButton uses its own wrapper inside, but we can override if it accepts style
  },

  // OTP Styles
  otpHeader: {
    marginBottom: 20,
  },
  otpTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Black',
    color: '#000',
  },
  otpSubtitle: {
    fontSize: 13,
    color: '#555',
    marginTop: 6,
    lineHeight: 18,
    fontWeight: '500',
  },
  otpEmailHighlight: {
    fontFamily: 'Inter-Black',
    color: '#8B5CF6',
  },
  backLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  backLinkText: {
    fontSize: 13,
    fontFamily: 'Inter-Black',
    color: '#000',
  },

  // Footer Terms
  footerSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerTermsText: {
    fontSize: 10,
    color: '#555',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
    fontWeight: '600',
  },
  termsLink: {
    color: '#000',
    fontFamily: 'Inter-Black',
    textDecorationLine: 'underline',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 12,
    fontFamily: 'Inter-Black',
    color: '#DC2626',
    flex: 1,
  },
});
