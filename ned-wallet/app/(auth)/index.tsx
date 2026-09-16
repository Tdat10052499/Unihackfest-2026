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
  LayoutAnimation,
  UIManager,
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

// Component đục lỗ cuống vé (Clipped Container Technique)
const TicketCutout = ({ size, left, right, transformX, bottomOffset = -3 }: { size: number, left?: number | string, right?: number | string, transformX?: number, bottomOffset?: number }) => {
  return (
    <View style={{
      position: 'absolute',
      bottom: bottomOffset, // Nâng lên 3px (độ dày viền) để đè khít viền dưới của Ticket
      ...(left !== undefined ? { left } : {}),
      ...(right !== undefined ? { right } : {}),
      ...(transformX !== undefined ? { transform: [{ translateX: transformX }] } : {}),
      width: size,
      height: (size / 2) + 3, // Chỉ hiển thị nửa trên + độ dày viền
      overflow: 'hidden', // Cắt xén hoàn hảo nửa dưới, KHÔNG cần dùng mask đè lên shadow!
      zIndex: 10,
    } as any}>
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FDF8F5',
        borderWidth: 3,
        borderColor: '#000',
      }} />
    </View>
  );
};

// Kích hoạt LayoutAnimation trên Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
    if (isNewUser) {
      router.replace('/(onboarding)/phone');
    } else {
      router.replace('/home');
    }
  };

  // Hook Privy Google OAuth
  const oAuthHook = useLoginWithOAuth({
    onError: (err) => {
      Alert.alert(
        isLoginMode ? 'Đăng nhập thất bại' : 'Đăng ký thất bại',
        err?.message || 'Không thể xác thực bằng tài khoản Google. Vui lòng thử lại.'
      );
    },
    onSuccess: (u, isNew) => {
      handleAuthSuccess(u, isNew ?? !isLoginMode, false);
    },
  });
  const loginWithOAuth = oAuthHook?.login;
  const oAuthState = oAuthHook?.state;

  // Hook Privy Email OTP
  const emailHook = useLoginWithEmail({
    onError: (err) => {
      setErrorMessage(err?.message || 'Không thể xử lý yêu cầu email. Vui lòng thử lại.');
    },
    onLoginSuccess: (u, isNew) => {
      handleAuthSuccess(u, isNew ?? !isLoginMode, false);
    },
  });
  const sendCode = emailHook?.sendCode;
  const loginWithCode = emailHook?.loginWithCode;
  const emailState = emailHook?.state;

  useEffect(() => {
    if (isReady && user) {
      handleAuthSuccess(user, false, true);
    }
  }, [isReady, user]);

  const handleSendEmailCode = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    setErrorMessage('');
    if (!sendCode) return;
    try {
      await sendCode({ email: trimmedEmail });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setStep('OTP_VERIFICATION');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      setErrorMessage(msg || 'Không thể gửi mã xác nhận.');
    }
  };

  const handleVerifyOtp = async () => {
    const trimmedCode = otpCode.trim();
    const trimmedEmail = email.trim();
    if (!trimmedCode) {
      setErrorMessage('Vui lòng nhập mã OTP 6 chữ số.');
      return;
    }
    setErrorMessage('');
    if (!loginWithCode) return;
    try {
      await loginWithCode({ code: trimmedCode, email: trimmedEmail });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      setErrorMessage(msg || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage('');
    if (!loginWithOAuth) return;
    try {
      await loginWithOAuth({ provider: 'google' });
    } catch (err: unknown) {
      console.log('Error triggering Google login:', err instanceof Error ? err.message : JSON.stringify(err));
    }
  };

  const switchMode = (mode: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsLoginMode(mode);
    setErrorMessage('');
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
                source={require('../../assets/images/mascot-welcome.png')} 
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
                  onPress={() => switchMode(true)}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.tabText, isLoginMode && styles.tabTextActive]}>
                    Đăng nhập
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabButton, !isLoginMode && styles.tabButtonActive]}
                  onPress={() => switchMode(false)}
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

                  <TouchableOpacity
                    style={[styles.primaryBtn, isSendingEmail && styles.primaryBtnDisabled]}
                    onPress={handleSendEmailCode}
                    disabled={isSendingEmail}
                    activeOpacity={0.85}
                  >
                    <View style={styles.primaryBtnShadow} />
                    <View style={styles.primaryBtnBody}>
                      {isSendingEmail ? (
                        <ActivityIndicator size="small" color="#000" />
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
                          <View style={styles.socialBtnIconContainer}>
                            <Ionicons name="logo-google" size={20} color="#EA4335" />
                          </View>
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
                    <View style={styles.primaryBtnShadow} />
                    <View style={styles.primaryBtnBody}>
                      {isSubmittingOtp ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <Text style={styles.primaryBtnText}>Xác nhận & Đăng nhập</Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.backLinkBtn}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
            <TicketCutout size={44} left="50%" transformX={-22} />
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
    paddingBottom: 20,
    alignItems: 'center',
  },

  // Brand Header
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFD54F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mascotImage: {
    width: '80%',
    height: '80%',
  },
  brandTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Black',
    color: '#000',
    marginTop: 12,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
    textAlign: 'center',
  },

  // Ticket Wrapper
  ticketWrapper: {
    width: '100%',
    position: 'relative',
    marginBottom: 40,
  },
  ticketShadow: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 24,
  },
  ticketBody: {
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 24,
    padding: 24,
    zIndex: 2, // Trên shadow
  },



  // Tabs
  tabContainer: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 30,
    padding: 4,
    marginBottom: 24,
    backgroundColor: '#FAF6F0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: '#8A2BE2', // Tím
    borderColor: '#000',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Black',
    color: '#555',
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
    backgroundColor: '#FAF6F0',
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
    top: 3,
    left: 3,
    right: -3,
    bottom: -3,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  primaryBtnBody: {
    width: '100%',
    height: '100%',
    backgroundColor: '#00E5FF', // Cyan
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
    color: '#000', // Đen theo yêu cầu
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
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
    top: 3,
    left: 3,
    right: -3,
    bottom: -3,
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
  },
  socialBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  socialBtnIconContainer: {
    width: 24,
    alignItems: 'flex-start',
  },
  socialBtnText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Inter-Black',
    color: '#000',
    marginRight: 24, // Để cân bằng với icon bên trái
  },
  phantomWrapper: {
    width: '100%',
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
    color: '#8A2BE2', // Tím
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
    marginBottom: 4, // Tránh sát viền
  },
  footerTermsText: {
    fontSize: 11,
    color: '#777',
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
