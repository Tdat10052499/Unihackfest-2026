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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { usePrivy } from '@privy-io/expo';

export default function OnboardingPhoneScreen() {
  const router = useRouter();
  const privy = usePrivy();
  const user = privy?.user || null;

  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Xử lý lưu số điện thoại Onboarding
  const handleContinue = async () => {
    const trimmed = phone.trim();
    if (!trimmed) {
      Alert.alert('Thông báo', 'Vui lòng nhập số điện thoại hoặc chọn Bỏ qua để vào ví.');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('📱 [Onboarding] Lưu số điện thoại người dùng mới:', trimmed, 'User ID:', user?.id);
      // Giả lập lưu thành công và điều hướng vào trang chính
      setTimeout(() => {
        setIsSubmitting(false);
        router.replace('/home');
      }, 600);
    } catch (e) {
      setIsSubmitting(false);
      Alert.alert('Lỗi', 'Không thể lưu số điện thoại lúc này. Bạn có thể cập nhật lại trong Cài đặt.');
    }
  };

  // Bỏ qua onboarding và vào thẳng màn hình chính
  const handleSkip = () => {
    console.log('⏩ [Onboarding] Người dùng chọn bỏ qua thiết lập số điện thoại');
    router.replace('/home');
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
          {/* Header Progress */}
          <View style={styles.headerRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>BƯỚC 1 / 1</Text>
            </View>
            <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
              <Text style={styles.skipBtnText}>Bỏ qua</Text>
            </TouchableOpacity>
          </View>

          {/* Hero Illustration Icon */}
          <View style={styles.heroSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="phone-portrait-outline" size={36} color="#00A859" />
            </View>
            <Text style={styles.heroTitle}>Liên kết Số điện thoại</Text>
            <Text style={styles.heroSubtitle}>
              Kích hoạt tính năng chuyển nhận tiền tức thì bằng Số điện thoại và tăng cường bảo mật cho ví N.E.D của bạn.
            </Text>
          </View>

          {/* Input Card Container */}
          <View style={styles.cardContainer}>
            <Text style={styles.inputLabel}>Số điện thoại của bạn</Text>

            <View style={styles.inputWrapper}>
              <View style={styles.countryCodeBadge}>
                <Text style={styles.flagEmoji}>🇻🇳</Text>
                <Text style={styles.countryCodeText}>+84</Text>
              </View>

              <TextInput
                style={styles.phoneInput}
                placeholder="0912 345 678"
                placeholderTextColor="#94A3B8"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoFocus
              />
            </View>

            <View style={styles.benefitBox}>
              <View style={styles.benefitRow}>
                <Feather name="check-circle" size={16} color="#00A859" />
                <Text style={styles.benefitText}>Nhận tiền từ bạn bè chỉ với số điện thoại</Text>
              </View>
              <View style={styles.benefitRow}>
                <Feather name="check-circle" size={16} color="#00A859" />
                <Text style={styles.benefitText}>Khôi phục ví khẩn cấp qua tin nhắn SMS OTP</Text>
              </View>
              <View style={styles.benefitRow}>
                <Feather name="check-circle" size={16} color="#00A859" />
                <Text style={styles.benefitText}>Miễn phí 100% không phát sinh cước viễn thông</Text>
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[styles.primaryBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleContinue}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {isSubmitting ? 'Đang kích hoạt...' : 'Hoàn tất & Vào ví ngay'}
              </Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Skip Link Button */}
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>Để sau, tôi muốn vào ví ngay</Text>
            </TouchableOpacity>
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
    marginBottom: 20,
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
    marginVertical: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#00A859',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
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
    marginTop: 10,
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
    marginBottom: 16,
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
    fontSize: 16,
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
    letterSpacing: 0.5,
  },

  // Benefit Box
  benefitBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 20,
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

  // Buttons
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
    marginTop: 8,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
