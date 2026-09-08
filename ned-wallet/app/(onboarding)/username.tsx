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
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePrivy } from '@privy-io/expo';

// Quy chuẩn Regex: chỉ cho phép chữ thường (a-z) và số (0-9), độ dài từ 3 đến 15 ký tự
const USERNAME_REGEX = /^[a-z0-9]{3,15}$/;

export default function OnboardingUsernameScreen() {
  const router = useRouter();
  const privy = usePrivy();
  const user = privy?.user || null;

  const [username, setUsername] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Xử lý lọc ký tự thời gian thực:
   * - Tự động đổi sang chữ thường
   * - Loại bỏ mọi ký tự đặc biệt, dấu tiếng Việt và khoảng trắng
   */
  const handleTextChange = (rawText: string) => {
    const sanitized = rawText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 15);

    setUsername(sanitized);

    // Kiểm tra tính hợp lệ tức thì nếu đã có dữ liệu
    if (sanitized.length === 0) {
      setErrorMessage('');
    } else if (sanitized.length < 3) {
      setErrorMessage('Tên định danh phải có ít nhất 3 ký tự.');
    } else if (!USERNAME_REGEX.test(sanitized)) {
      setErrorMessage('Chỉ được sử dụng chữ cái thường (a-z) và số (0-9).');
    } else {
      setErrorMessage('');
    }
  };

  // Xử lý gửi biểu mẫu và lưu định danh
  const handleContinue = async () => {
    const trimmed = username.trim().toLowerCase();

    if (!trimmed) {
      setErrorMessage('Vui lòng nhập tên định danh của bạn.');
      Alert.alert('Chưa nhập tên', 'Vui lòng nhập tên định danh mong muốn.');
      return;
    }

    if (trimmed.length < 3 || trimmed.length > 15 || !USERNAME_REGEX.test(trimmed)) {
      setErrorMessage('Tên định danh phải từ 3 đến 15 ký tự và chỉ chứa chữ cái thường (a-z), số (0-9).');
      Alert.alert(
        'Tên không hợp lệ',
        'Tên định danh phải từ 3 đến 15 ký tự, không chứa khoảng trắng hay ký tự đặc biệt.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      console.log('👤 [Onboarding Username] Đang lưu định danh SNS:', trimmed, 'User ID:', user?.id);

      // 1. Lưu tạm tên định danh vào AsyncStorage
      await AsyncStorage.setItem('@ned_wallet_user_handle', trimmed);
      await AsyncStorage.setItem('@ned_wallet_full_sns', `${trimmed}.sol`);

      // 2. Chuyển tiếp sang màn hình Chào mừng kèm tham số tên
      router.replace({
        pathname: '/(onboarding)/welcome',
        params: { name: trimmed },
      });
    } catch (err: unknown) {
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('❌ [Onboarding Username Error]:', msg);
      setErrorMessage('Không thể lưu tên định danh lúc này. Vui lòng thử lại.');
      Alert.alert('Lỗi', 'Không thể lưu tên định danh lúc này. Vui lòng thử lại.');
    }
  };

  const isFormValid = username.length >= 3 && username.length <= 15 && USERNAME_REGEX.test(username);

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
              <Text style={styles.stepBadgeText}>BƯỚC 2 / 2</Text>
            </View>
          </View>

          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="at-circle-outline" size={38} color="#00A859" />
            </View>
            <Text style={styles.heroTitle}>Tạo định danh của bạn</Text>
            <Text style={styles.heroSubtitle}>
              Tên này sẽ được dùng để nhận tiền và không thể thay đổi sau khi tạo (Ví dụ: alex sẽ trở thành alex.sol)
            </Text>
          </View>

          {/* Card Container */}
          <View style={styles.cardContainer}>
            <Text style={styles.inputLabel}>Tên định danh (Username)</Text>

            {/* Input Wrapper */}
            <View
              style={[
                styles.inputWrapper,
                !!errorMessage && styles.inputWrapperError,
                isFormValid && styles.inputWrapperSuccess,
              ]}
            >
              <Text style={styles.prefixText}>@</Text>
              <TextInput
                style={styles.textInput}
                placeholder="alex"
                placeholderTextColor="#94A3B8"
                value={username}
                onChangeText={handleTextChange}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={15}
                autoFocus
                editable={!isSubmitting}
              />
              <View style={styles.suffixBadge}>
                <Text style={styles.suffixText}>.sol</Text>
              </View>
            </View>

            {/* Error Message Display */}
            {!!errorMessage && (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={14} color="#DC2626" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Validation Hints & Rules */}
            <View style={styles.rulesBox}>
              <View style={styles.ruleItem}>
                <Feather
                  name={username.length >= 3 && username.length <= 15 ? 'check-circle' : 'circle'}
                  size={14}
                  color={username.length >= 3 && username.length <= 15 ? '#00A859' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.ruleText,
                    username.length >= 3 && username.length <= 15 && styles.ruleTextActive,
                  ]}
                >
                  Độ dài từ 3 đến 15 ký tự
                </Text>
              </View>

              <View style={styles.ruleItem}>
                <Feather
                  name={username.length > 0 && USERNAME_REGEX.test(username) ? 'check-circle' : 'circle'}
                  size={14}
                  color={username.length > 0 && USERNAME_REGEX.test(username) ? '#00A859' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.ruleText,
                    username.length > 0 && USERNAME_REGEX.test(username) && styles.ruleTextActive,
                  ]}
                >
                  Chỉ gồm chữ thường (a-z) và chữ số (0-9)
                </Text>
              </View>

              <View style={styles.ruleItem}>
                <Feather
                  name="shield"
                  size={14}
                  color="#6366F1"
                />
                <Text style={styles.ruleText}>
                  Miễn phí khởi tạo trên hệ sinh thái Solana
                </Text>
              </View>
            </View>

            {/* Action Button: Tiếp tục */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!isFormValid || isSubmitting) && styles.btnDisabled,
              ]}
              onPress={handleContinue}
              disabled={!isFormValid || isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Tiếp tục</Text>
                  <Feather name="arrow-right" size={18} color="#FFFFFF" />
                </>
              )}
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

  heroSection: {
    alignItems: 'center',
    marginVertical: 14,
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
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },

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
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapperError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  inputWrapperSuccess: {
    borderColor: '#00A859',
    backgroundColor: '#F0FDF4',
  },
  prefixText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00A859',
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '700',
  },
  suffixBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 6,
  },
  suffixText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },

  // Error Row
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },

  // Rules Box
  rulesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  ruleTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },

  // Primary Button
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
    opacity: 0.5,
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
