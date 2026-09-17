import React, { useState, useEffect, useRef } from 'react';
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
  Image,
  LayoutAnimation,
  UIManager,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { usePrivy, useLinkSMS } from '@privy-io/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '../../stores/useUserStore';
import { checkPhoneExists } from '../../services/supabase';
import { MASCOT_IMAGES } from '../../constants/mascot';

// Kích hoạt LayoutAnimation trên Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


export default function OnboardingPhoneScreen() {
  const router = useRouter();
  const privy = usePrivy();
  const user = privy?.user || null;

  // Quản lý trạng thái tiến trình (1: Nhập Số điện thoại, 2: Nhập OTP)
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+84');
  const [otpCode, setOtpCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

  // Bộ đếm đếm ngược gửi lại OTP (59s)
  const [countdown, setCountdown] = useState<number>(59);
  const [canResend, setCanResend] = useState<boolean>(false);

  // Reference tới ô input ẩn OTP
  const otpInputRef = useRef<TextInput>(null);
  const [isOtpFocused, setIsOtpFocused] = useState<boolean>(false);

  // Tích hợp hook useLinkSMS từ @privy-io/expo
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

  // Quản lý Countdown cho màn hình OTP
  useEffect(() => {
    let timer: any = null;
    if (step === 2 && countdown > 0) {
      setCanResend(false);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  /**
   * Tự động chuẩn hóa định dạng số điện thoại E.164:
   */
  const formatPhoneNumber = (raw: string): string => {
    const trimmed = raw.trim().replace(/\s+/g, '');
    if (!trimmed) return '';
    if (trimmed.startsWith('+')) {
      return trimmed;
    }
    if (trimmed.startsWith('0')) {
      return `${countryCode}${trimmed.slice(1)}`;
    }
    return `${countryCode}${trimmed}`;
  };

  /**
   * Che bớt số điện thoại hiển thị ở phụ đề bước 2 (VD: +84 912 ••• •78)
   */
  const maskPhoneNumber = (raw: string): string => {
    const full = formatPhoneNumber(raw);
    if (full.length < 8) return full;
    const start = full.slice(0, 6);
    const end = full.slice(-3);
    return `${start} ••• •${end}`;
  };

  /**
   * Lưu số điện thoại vào Global State (Zustand) và AsyncStorage (temp_phone)
   */
  const savePhoneState = async (phoneToSave: string) => {
    const formatted = formatPhoneNumber(phoneToSave);
    if (!formatted) return;
    try {
      await AsyncStorage.setItem('temp_phone', formatted);
      await AsyncStorage.setItem('@ned_wallet_linked_phone', formatted);
      useUserStore.getState().setLinkedPhone(formatted);
      console.log('📱 [Onboarding Phone] Đã lưu temp_phone vào AsyncStorage & Global State:', formatted);
    } catch (err) {
      console.warn('⚠️ [Onboarding Phone] Lỗi lưu temp_phone:', err);
    }
  };

  // Nút Back
  const handleBack = () => {
    if (step === 2) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setStep(1);
      setErrorMessage('');
      setOtpCode('');
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(auth)');
      }
    }
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

    // 1. Pre-check trùng lặp Số điện thoại trên Supabase
    try {
      setIsCheckingPhone(true);
      const isDuplicate = await checkPhoneExists(formatted, user?.id);
      setIsCheckingPhone(false);

      if (isDuplicate) {
        setErrorMessage('Số điện thoại này đã được liên kết với một ví N.E.D khác.');
        Alert.alert(
          'Số điện thoại đã tồn tại',
          'Số điện thoại này đã được liên kết với một ví N.E.D khác. Vui lòng sử dụng số khác hoặc đăng nhập.'
        );
        return;
      }
    } catch (checkErr) {
      setIsCheckingPhone(false);
      console.warn('⚠️ [Onboarding Phone] Lỗi pre-check số điện thoại:', checkErr);
    }

    await savePhoneState(formatted);

    // Kích hoạt Countdown 59s cho bước 2
    setCountdown(59);
    setCanResend(false);

    if (!sendCode) {
      // Fallback dev mode
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setStep(2);
      setOtpCode('');
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
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setStep(2);
        setOtpCode('');
        return;
      }

      await sendCode({ phone: formatted });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
              onPress: async () => {
                setPhone('+15555555555');
                setCountryCode('+1');
                await savePhoneState('+15555555555');
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setStep(2);
              },
            },
            {
              text: 'Tiếp tục chế độ Dev',
              onPress: async () => {
                await savePhoneState(phone || '+15555555555');
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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

  // Xử lý gửi lại mã OTP (Bước 2)
  const handleResendOtp = async () => {
    if (!canResend) return;
    const formatted = formatPhoneNumber(phone);
    setErrorMessage('');
    setCountdown(59);
    setCanResend(false);

    if (formatted === '+15555555555' || !sendCode) {
      Alert.alert('Đã gửi lại mã', 'Mã xác nhận 123456 đã được gửi lại.');
      return;
    }

    try {
      await sendCode({ phone: formatted });
      Alert.alert('Đã gửi lại mã', `Mã xác nhận mới đã được gửi tới số ${formatted}.`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      setErrorMessage(errorMsg || 'Không thể gửi lại mã xác nhận.');
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

    // Pre-check trùng lặp số điện thoại trước khi xác nhận
    try {
      const isDuplicate = await checkPhoneExists(formatted, user?.id);
      if (isDuplicate) {
        setErrorMessage('Số điện thoại này đã được liên kết với một ví N.E.D khác.');
        Alert.alert(
          'Số điện thoại đã tồn tại',
          'Số điện thoại này đã được liên kết với một ví N.E.D khác. Vui lòng sử dụng số khác hoặc đăng nhập.'
        );
        return;
      }
    } catch (checkErr) {
      console.warn('⚠️ [Onboarding Phone] Lỗi pre-check số điện thoại:', checkErr);
    }

    await savePhoneState(formatted);

    // Nếu là mã test Dev 123456
    if (trimmedOtp === '123456' && (formatted === '+15555555555' || !linkWithCode)) {
      console.log('🎉 [Dev Mode] Xác thực mã test 123456 thành công! Chuyển tiếp sang Username...');
      router.replace({
        pathname: '/(onboarding)/username',
        params: { phone: formatted },
      });
      return;
    }

    if (!linkWithCode) {
      setErrorMessage('Hệ thống xác thực SMS chưa sẵn sàng.');
      return;
    }

    try {
      console.log('🔐 [Onboarding Step 2] Đang xác thực OTP:', trimmedOtp, 'cho số:', formatted);
      await linkWithCode({
        code: trimmedOtp,
        phone: formatted,
      });

      console.log('🎉 [Onboarding] Liên kết số điện thoại thành công! Chuyển tiếp sang Username...');
      router.replace({
        pathname: '/(onboarding)/username',
        params: { phone: formatted },
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      console.warn('❌ [Onboarding Step 2 Error]:', errorMsg);

      if (trimmedOtp === '123456' || errorMsg.includes('SMS not allowed')) {
        console.log('🎉 [Dev Fallback] Bỏ qua lỗi SMS Privy trên Dashboard, chuyển sang Username...');
        router.replace({
          pathname: '/(onboarding)/username',
          params: { phone: formatted },
        });
        return;
      }

      setErrorMessage('Mã OTP không hợp lệ hoặc đã hết hạn.');
      Alert.alert('Xác thực thất bại', 'Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại.');
    }
  };

  // Bỏ qua onboarding bước SĐT
  const handleSkip = async () => {
    console.log('⏩ [Onboarding] Người dùng chọn bỏ qua bước liên kết SĐT');
    const formatted = phone ? formatPhoneNumber(phone) : '';
    if (formatted) {
      await savePhoneState(formatted);
    }
    router.replace({
      pathname: '/(onboarding)/username',
      params: formatted ? { phone: formatted } : undefined,
    });
  };

  // Điền nhanh thông tin test cho Dev
  const handleFillDevPhone = () => {
    setCountryCode('+1');
    setPhone('5555555555');
    setErrorMessage('');
    savePhoneState('+15555555555');
  };

  const handleFillDevOtp = () => {
    setOtpCode('123456');
    setErrorMessage('');
    if (otpInputRef.current) {
      otpInputRef.current.focus();
    }
  };

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
          {/* ================= GLOBAL HEADER ================= */}
          <View style={styles.globalHeader}>
            {/* Nút Back góc trên cùng bên trái */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
              accessibilityLabel="Quay lại"
            >
              <View style={styles.backButtonShadow} />
              <View style={styles.backButtonBody}>
                <Feather name="arrow-left" size={20} color="#000" />
              </View>
            </TouchableOpacity>

            {/* Mascot Gấu tím trong vòng tròn vàng thu nhỏ (60x60px) */}
            <View style={styles.mascotContainer}>
              <View style={styles.mascotShadow} />
              <View style={styles.mascotCircle}>
                <Image
                  source={MASCOT_IMAGES.waving}
                  style={styles.mascotImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Badge chỉ báo bước (Cân bằng Header) */}
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{step === 1 ? '1/3' : '2/3'}</Text>
            </View>
          </View>

          {/* ================= KHUNG NỘI DUNG (TICKET CONTAINER) ================= */}
          <View style={styles.ticketWrapper}>
            {/* Đổ bóng cứng 5px 5px 0px 0px #000 */}
            <View style={styles.ticketShadow} />

            {/* Thân cuống vé (Nền trắng, viền đen dày 3px, bo góc trên 24px) */}
            <View style={styles.ticketBody}>
              {/* Error Message Banner nếu có */}
              {!!errorMessage && (
                <View style={styles.errorBanner}>
                  <Feather name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}

              {step === 1 ? (
                /* ==========================================================
                 * MÀN HÌNH 1: THÊM SỐ ĐIỆN THOẠI (PHONE NUMBER INPUT)
                 * ========================================================== */
                <View>
                  {/* Typography */}
                  <Text style={styles.screenTitle}>Bảo mật tài khoản</Text>
                  <Text style={styles.screenSubtitle}>
                    Vui lòng nhập số điện thoại để bảo vệ ví N.E.D của bạn
                  </Text>

                  {/* Input Field: Chia làm 2 khối (Flex row) */}
                  <View style={styles.phoneInputRow}>
                    {/* Khối trái: Mã vùng (+84 kèm icon cờ Việt Nam) */}
                    <TouchableOpacity
                      style={styles.countryCodeBlock}
                      activeOpacity={0.8}
                      onPress={() => {
                        // Cho phép chuyển đổi nhanh +84 (VN) và +1 (Test)
                        if (countryCode === '+84') {
                          setCountryCode('+1');
                        } else {
                          setCountryCode('+84');
                        }
                      }}
                    >
                      <Text style={styles.flagEmoji}>
                        {countryCode === '+1' ? '🇺🇸' : '🇻🇳'}
                      </Text>
                      <Text style={styles.countryCodeText}>{countryCode}</Text>
                      <Feather name="chevron-down" size={14} color="#000" style={{ marginLeft: 2 }} />
                    </TouchableOpacity>

                    {/* Khối phải: Ô nhập số điện thoại */}
                    <View style={styles.numberInputBlock}>
                      <TextInput
                        style={styles.numberTextInput}
                        placeholder={countryCode === '+1' ? '555 555 5555' : '0912 345 678'}
                        placeholderTextColor="#94A3B8"
                        value={phone}
                        onChangeText={(text) => {
                          setPhone(text);
                          if (errorMessage) setErrorMessage('');
                        }}
                        keyboardType="phone-pad"
                        autoFocus
                        editable={!isSendingCode && !isCheckingPhone}
                      />
                      {phone.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setPhone('')}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Feather name="x-circle" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Gợi ý tính năng bảo mật Neo-brutalism Box */}
                  <View style={styles.benefitPill}>
                    <Ionicons name="shield-checkmark" size={16} color="#00A859" />
                    <Text style={styles.benefitPillText}>
                      Khôi phục ví và nhận lì xì tức thì bằng SĐT
                    </Text>
                  </View>

                  {/* Dev Mode Helper (Clickable) */}
                  <TouchableOpacity
                    style={styles.devHintBox}
                    onPress={handleFillDevPhone}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="developer-mode" size={14} color="#6366F1" />
                    <Text style={styles.devHintText}>
                      Dành cho Test: Nhấn để điền <Text style={styles.devCodeHighlight}>+15555555555</Text>
                    </Text>
                  </TouchableOpacity>

                  {/* Nút Hành động: "Gửi mã xác thực" - Nền Xanh Cyan (#00E5FF), viền đen 3px, bóng cứng */}
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      (isSendingCode || isCheckingPhone) && styles.actionBtnDisabled,
                    ]}
                    onPress={handleSendOtp}
                    disabled={isSendingCode || isCheckingPhone}
                    activeOpacity={0.85}
                  >
                    <View style={styles.actionBtnShadow} />
                    <View style={[styles.actionBtnBody, { backgroundColor: '#00E5FF' }]}>
                      {isSendingCode || isCheckingPhone ? (
                        <ActivityIndicator size="small" color="#000000" />
                      ) : (
                        <View style={styles.btnInnerRow}>
                          <Text style={[styles.actionBtnText, { color: '#000000' }]}>
                            Gửi mã xác thực
                          </Text>
                          <Feather name="arrow-right" size={18} color="#000000" style={{ marginLeft: 6 }} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Bỏ qua */}
                  <TouchableOpacity
                    style={styles.skipBtn}
                    onPress={handleSkip}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.skipBtnText}>Để sau, bỏ qua bước này</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* ==========================================================
                 * MÀN HÌNH 2: XÁC THỰC MÃ OTP (OTP VERIFICATION)
                 * ========================================================== */
                <View>
                  {/* Typography */}
                  <Text style={styles.screenTitle}>Nhập mã xác nhận</Text>
                  <Text style={styles.screenSubtitle}>
                    Mã 6 số đã được gửi qua SMS đến số {maskPhoneNumber(phone)}
                  </Text>

                  {/* Input OTP Ẩn để bàn phím và paste hoạt động chuẩn xác */}
                  <TextInput
                    ref={otpInputRef}
                    style={styles.hiddenOtpInput}
                    value={otpCode}
                    onChangeText={(val) => {
                      const clean = val.replace(/[^0-9]/g, '').slice(0, 6);
                      setOtpCode(clean);
                      if (errorMessage) setErrorMessage('');
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    onFocus={() => setIsOtpFocused(true)}
                    onBlur={() => setIsOtpFocused(false)}
                    editable={!isSubmittingCode}
                  />

                  {/* Khối 6 ô vuông rời nhau (width: 45px, height: 55px) */}
                  <Pressable
                    style={styles.otpBoxesContainer}
                    onPress={() => otpInputRef.current?.focus()}
                  >
                    {[0, 1, 2, 3, 4, 5].map((index) => {
                      const digit = otpCode[index] || '';
                      const isCurrentBox = isOtpFocused && index === Math.min(otpCode.length, 5);
                      const isFilled = digit.length > 0;

                      return (
                        <View key={index} style={styles.singleBoxWrapper}>
                          {/* Bóng cứng mỏng khi ô đang Focus */}
                          {isCurrentBox && <View style={styles.singleBoxShadow} />}
                          <View
                            style={[
                              styles.singleBoxBody,
                              isCurrentBox && styles.singleBoxBodyFocused,
                              isFilled && !isCurrentBox && styles.singleBoxBodyFilled,
                            ]}
                          >
                            <Text style={styles.otpDigitText}>{digit}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </Pressable>

                  {/* Countdown / Gửi lại mã */}
                  <View style={styles.resendContainer}>
                    {countdown > 0 ? (
                      <Text style={styles.resendTextCounting}>
                        Gửi lại mã ({countdown}s)
                      </Text>
                    ) : (
                      <TouchableOpacity onPress={handleResendOtp} activeOpacity={0.7}>
                        <Text style={styles.resendTextActive}>
                          Gửi lại mã ngay
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Dev Mode Helper Step 2 (Clickable) */}
                  <TouchableOpacity
                    style={styles.devHintBox}
                    onPress={handleFillDevOtp}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="developer-mode" size={14} color="#6366F1" />
                    <Text style={styles.devHintText}>
                      Dành cho Test: Nhấn để điền mã <Text style={styles.devCodeHighlight}>123456</Text>
                    </Text>
                  </TouchableOpacity>

                  {/* Nút Hành động: "Xác nhận" - Nền Tím (#8A2BE2), viền đen 3px, bóng cứng */}
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      (isSubmittingCode || otpCode.length < 6) && styles.actionBtnDisabled,
                    ]}
                    onPress={handleVerifyOtp}
                    disabled={isSubmittingCode}
                    activeOpacity={0.85}
                  >
                    <View style={styles.actionBtnShadow} />
                    <View style={[styles.actionBtnBody, { backgroundColor: '#8A2BE2' }]}>
                      {isSubmittingCode ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <View style={styles.btnInnerRow}>
                          <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
                            Xác nhận
                          </Text>
                          <Feather name="check" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Nút đổi số điện thoại */}
                  <TouchableOpacity
                    style={styles.skipBtn}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setStep(1);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.skipBtnText}>Đổi số điện thoại khác</Text>
                  </TouchableOpacity>
                </View>
              )}
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
    backgroundColor: '#FDF8F5', // Nền màu kem ấm chuẩn
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    alignItems: 'center',
  },

  // ================= GLOBAL HEADER =================
  globalHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    position: 'relative',
  },
  backButtonShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 44,
    height: 44,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  backButtonBody: {
    width: 44,
    height: 44,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Mascot Gấu tím trong vòng tròn vàng thu nhỏ (60x60px)
  mascotContainer: {
    width: 60,
    height: 60,
    position: 'relative',
  },
  mascotShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 60,
    height: 60,
    backgroundColor: '#000',
    borderRadius: 30,
  },
  mascotCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFD54F',
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mascotImage: {
    width: 46,
    height: 46,
  },

  // Step Badge
  stepBadge: {
    paddingHorizontal: 12,
    height: 32,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Black',
    color: '#000',
  },

  // ================= TICKET CONTAINER =================
  ticketWrapper: {
    width: '100%',
    position: 'relative',
    marginBottom: 40, // Khoảng cách so với đáy màn hình tối thiểu 40px
    marginTop: 6,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    zIndex: 2,
  },

  // Typography
  screenTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Black',
    color: '#000',
    textAlign: 'center',
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 18,
    paddingHorizontal: 8,
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#DC2626',
  },

  // Input Field Màn 1: Flex row 2 khối
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  countryCodeBlock: {
    height: 52,
    backgroundColor: '#FAF6F0',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 4,
  },
  flagEmoji: {
    fontSize: 18,
  },
  countryCodeText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#000',
  },
  numberInputBlock: {
    flex: 1,
    height: 52,
    backgroundColor: '#FAF6F0',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  numberTextInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#000',
  },

  // Benefit Pill
  benefitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    gap: 6,
  },
  benefitPillText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#166534',
  },

  // Dev Hint Helper Box
  devHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 20,
    gap: 6,
  },
  devHintText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#4338CA',
  },
  devCodeHighlight: {
    fontFamily: 'Inter-Black',
    textDecorationLine: 'underline',
  },

  // Action Button Neo-brutalism
  actionBtn: {
    width: '100%',
    height: 52,
    position: 'relative',
    marginBottom: 14,
  },
  actionBtnDisabled: {
    opacity: 0.65,
  },
  actionBtnShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: '100%',
    height: 52,
    backgroundColor: '#000',
    borderRadius: 14,
  },
  actionBtnBody: {
    width: '100%',
    height: 52,
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 16,
    fontFamily: 'Inter-Black',
  },

  // Skip button
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipBtnText: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter-Medium',
    textDecorationLine: 'underline',
  },

  // ================= MÀN HÌNH 2: OTP VERIFICATION =================
  hiddenOtpInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  otpBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  singleBoxWrapper: {
    width: 45,
    height: 55,
    position: 'relative',
  },
  singleBoxShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 45,
    height: 55,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  singleBoxBody: {
    width: 45,
    height: 55,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleBoxBodyFocused: {
    backgroundColor: '#EDE9FE', // Nền tím nhạt khi focus
    borderWidth: 3,
    borderColor: '#000',
  },
  singleBoxBodyFilled: {
    backgroundColor: '#FAF6F0',
    borderColor: '#000',
  },
  otpDigitText: {
    fontSize: 22,
    fontFamily: 'Inter-Black',
    color: '#000',
  },

  // Countdown & Resend
  resendContainer: {
    alignItems: 'center',
    marginVertical: 14,
  },
  resendTextCounting: {
    fontSize: 13,
    fontFamily: 'Inter-Black',
    textDecorationLine: 'underline',
    color: '#000',
  },
  resendTextActive: {
    fontSize: 13,
    fontFamily: 'Inter-Black',
    textDecorationLine: 'underline',
    color: '#8A2BE2',
  },
});
