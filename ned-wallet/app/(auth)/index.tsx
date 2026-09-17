import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Easing,
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
import { MASCOT_IMAGES } from '../../constants/mascot';
import { useTranslation } from '@/services/i18n';

// Kích hoạt LayoutAnimation trên Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AuthGatewayScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const privy = usePrivy();
  const isReady = privy?.isReady ?? false;
  const user = privy?.user ?? null;

  // State chuyển đổi chế độ Đăng nhập / Đăng ký
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true);

  // Animation states cho hiệu ứng chuyển tab mượt mà
  const tabAnim = useRef(new Animated.Value(0)).current; // 0: Login, 1: Signup
  const contentFadeAnim = useRef(new Animated.Value(1)).current;
  const contentSlideAnim = useRef(new Animated.Value(0)).current;
  const mascotScaleAnim = useRef(new Animated.Value(1)).current;
  const [tabItemWidth, setTabItemWidth] = useState<number>(0);

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
        isLoginMode ? t('auth.loginFailed', { defaultValue: 'Đăng nhập thất bại' }) : t('auth.signupFailed', { defaultValue: 'Đăng ký thất bại' }),
        err?.message || t('auth.googleAuthFailed', { defaultValue: 'Không thể xác thực bằng tài khoản Google. Vui lòng thử lại.' })
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
      setErrorMessage(err?.message || t('auth.emailReqFailed', { defaultValue: 'Không thể xử lý yêu cầu email. Vui lòng thử lại.' }));
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
      setErrorMessage(t('auth.enterValidEmail', { defaultValue: 'Vui lòng nhập địa chỉ email hợp lệ.' }));
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
      setErrorMessage(msg || t('auth.sendCodeFailed', { defaultValue: 'Không thể gửi mã xác nhận.' }));
    }
  };

  const handleVerifyOtp = async () => {
    const trimmedCode = otpCode.trim();
    const trimmedEmail = email.trim();
    if (!trimmedCode) {
      setErrorMessage(t('auth.enterOtp', { defaultValue: 'Vui lòng nhập mã OTP 6 chữ số.' }));
      return;
    }
    setErrorMessage('');
    if (!loginWithCode) return;
    try {
      await loginWithCode({ code: trimmedCode, email: trimmedEmail });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      setErrorMessage(msg || t('auth.invalidOtp', { defaultValue: 'Mã OTP không hợp lệ hoặc đã hết hạn.' }));
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
    if (mode === isLoginMode) return;
    setErrorMessage('');

    // 1. Trượt con trỏ tab mượt mà, dứt khoát (190ms, không đàn hồi lò xo thừa)
    Animated.timing(tabAnim, {
      toValue: mode ? 0 : 1,
      duration: 190,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // 2. Mascot nảy micro-pop nhẹ nhàng (150ms)
    Animated.sequence([
      Animated.timing(mascotScaleAnim, {
        toValue: 1.08,
        duration: 60,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(mascotScaleAnim, {
        toValue: 1,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // 3. Chuyển đổi nội dung biểu mẫu tức thì kèm trượt nhẹ 180ms
    setIsLoginMode(mode);
    const direction = mode ? 1 : -1;
    contentFadeAnim.setValue(0.35);
    contentSlideAnim.setValue(direction * 8);
    Animated.parallel([
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentSlideAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
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
            <Animated.View style={[styles.logoBadge, { transform: [{ scale: mascotScaleAnim }] }]}>
              <Image 
                source={isLoginMode ? MASCOT_IMAGES.waving : MASCOT_IMAGES.exciting} 
                style={styles.mascotImage} 
                resizeMode="contain" 
              />
            </Animated.View>
            <Text style={styles.brandTitle}>N.E.D WALLET</Text>
            <Text style={styles.brandSubtitle}>
              {t('auth.walletSlogan', { defaultValue: 'Ví Solana Thông Minh & Bảo Mật Tuyệt Đối' })}
            </Text>
          </View>

          {/* Ticket Wrapper */}
          <View style={styles.ticketWrapper}>
            {/* Ticket Shadow */}
            <View style={styles.ticketShadow} />

            {/* Ticket Body */}
            <View style={styles.ticketBody}>
              {/* Mode Switcher Tabs với Sliding Indicator Animation */}
              <View style={styles.tabContainer}>
                {/* Sliding Pill Indicator */}
                {tabItemWidth > 0 && (
                  <Animated.View
                    style={[
                      styles.slidingIndicator,
                      {
                        width: tabItemWidth,
                        transform: [
                          {
                            translateX: tabAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, tabItemWidth],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                )}

                <TouchableOpacity
                  style={styles.tabButton}
                  onLayout={(e) => {
                    const w = e.nativeEvent.layout.width;
                    if (w > 0 && Math.abs(w - tabItemWidth) > 0.5) {
                      setTabItemWidth(w);
                    }
                  }}
                  onPress={() => switchMode(true)}
                  activeOpacity={0.8}
                >
                  <Animated.Text
                    style={[
                      styles.tabText,
                      {
                        color: tabAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['#FFFFFF', '#555555'],
                        }),
                      },
                    ]}
                  >
                    {t('auth.loginTab', { defaultValue: 'Đăng nhập' })}
                  </Animated.Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.tabButton}
                  onPress={() => switchMode(false)}
                  activeOpacity={0.8}
                >
                  <Animated.Text
                    style={[
                      styles.tabText,
                      {
                        color: tabAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['#555555', '#FFFFFF'],
                        }),
                      },
                    ]}
                  >
                    {t('auth.signupTab', { defaultValue: 'Đăng ký' })}
                  </Animated.Text>
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
                /* Bước 1: Nhập Email & Lựa chọn phương thức kèm Animation */
                <Animated.View
                  style={[
                    styles.formSection,
                    {
                      opacity: contentFadeAnim,
                      transform: [{ translateX: contentSlideAnim }],
                    },
                  ]}
                >
                  <View style={styles.formHeader}>
                    <Text style={styles.formTitle}>
                      {isLoginMode ? t('auth.welcomeBack', { defaultValue: 'Chào mừng trở lại!' }) : t('auth.createNewAccount', { defaultValue: 'Tạo tài khoản mới' })}
                    </Text>
                    <Text style={styles.formSubtitle}>
                      {isLoginMode
                        ? t('auth.loginSubtitle', { defaultValue: 'Đăng nhập vào ví N.E.D của bạn' })
                        : t('auth.signupSubtitle', { defaultValue: 'Bắt đầu trải nghiệm Web3 không cần Seedphrase' })}
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t('auth.emailAddressLabel', { defaultValue: 'Địa chỉ Email' })}</Text>
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
                          {isLoginMode ? t('auth.continueWithEmail', { defaultValue: 'Tiếp tục với Email' }) : t('auth.signupWithEmail', { defaultValue: 'Đăng ký với Email' })}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>{t('auth.orContinueWith', { defaultValue: 'hoặc tiếp tục với' })}</Text>
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
                            {isLoginMode ? t('auth.continueWithGoogle', { defaultValue: 'Tiếp tục với Google' }) : t('auth.signupWithGoogle', { defaultValue: 'Đăng ký với Google' })}
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
                </Animated.View>
              ) : (
                /* Bước 2: Xác thực mã OTP qua Email */
                <View style={styles.formSection}>
                  <View style={styles.otpHeader}>
                    <Text style={styles.otpTitle}>{t('auth.enterOtpTitle', { defaultValue: 'Nhập mã xác thực' })}</Text>
                    <Text style={styles.otpSubtitle}>
                      {t('auth.otpSentMsg', { defaultValue: 'Mã 6 chữ số đã được gửi tới' })}{' '}
                      <Text style={styles.otpEmailHighlight}>{email}</Text>
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t('auth.otpLabel', { defaultValue: 'Mã xác thực OTP' })}</Text>
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
                        <Text style={styles.primaryBtnText}>{t('auth.verifyLogin', { defaultValue: 'Xác nhận & Đăng nhập' })}</Text>
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
                    <Text style={styles.backLinkText}>{t('auth.changeEmail', { defaultValue: 'Đổi địa chỉ email khác' })}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Footer Terms */}
              <View style={styles.footerSection}>
                <Text style={styles.footerTermsText}>
                  {t('auth.termsPrefix', { defaultValue: 'Bằng việc tiếp tục, bạn đồng ý với' })}{' '}
                  <Text style={styles.termsLink}>{t('auth.termsLink', { defaultValue: 'Điều khoản dịch vụ' })}</Text> {t('auth.and', { defaultValue: 'và' })}{' '}
                  <Text style={styles.termsLink}>{t('auth.privacyLink', { defaultValue: 'Chính sách bảo mật' })}</Text>
                </Text>
              </View>
            </View>
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
    padding: 3,
    marginBottom: 24,
    backgroundColor: '#FAF6F0',
    position: 'relative',
    overflow: 'hidden', // Khóa chặt không cho phần tô tím tràn ra ngoài viền tổng
  },
  slidingIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    backgroundColor: '#8A2BE2', // Tím Neo-brutalism
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 26,
    zIndex: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    zIndex: 2,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Black',
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
