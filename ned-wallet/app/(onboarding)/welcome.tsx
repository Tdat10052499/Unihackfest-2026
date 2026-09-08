import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function OnboardingWelcomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();
  const name = params?.name || 'bạn';

  // Animation values cho hiệu ứng Fade-in và Scale
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const badgeScaleAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // 1. Kích hoạt hiệu ứng xuất hiện mượt mà
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(badgeScaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 50,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Tự động điều hướng vào ví chính sau đúng 2500ms (2.5 giây)
    const redirectTimer = setTimeout(() => {
      console.log('🚀 [Onboarding Welcome] 2500ms hoàn tất, điều hướng vào Home...');
      router.replace('/home');
    }, 2500);

    return () => clearTimeout(redirectTimer);
  }, [fadeAnim, scaleAnim, badgeScaleAnim, router]);

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <View style={styles.contentContainer}>
        {/* Animated Main Box */}
        <Animated.View
          style={[
            styles.animatedWrapper,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Animated Success Icon Badge */}
          <Animated.View
            style={[
              styles.iconCircle,
              {
                transform: [{ scale: badgeScaleAnim }],
              },
            ]}
          >
            <View style={styles.innerIconGlow}>
              <Ionicons name="sparkles" size={44} color="#00A859" />
            </View>
          </Animated.View>

          {/* Greeting & Welcome Title */}
          <Text style={styles.welcomeSub}>CHÚC MỪNG BẠN</Text>
          <Text style={styles.welcomeTitle}>
            Ví của <Text style={styles.highlightName}>{name}.sol</Text> đã sẵn sàng!
          </Text>

          <Text style={styles.welcomeDesc}>
            Đang khởi tạo tài khoản và chuyển bạn vào giao diện ví chính...
          </Text>

          {/* Progress Indicator Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    opacity: fadeAnim,
                  },
                ]}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  animatedWrapper: {
    alignItems: 'center',
    width: '100%',
  },

  // Icon Badge
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1E293B',
    borderWidth: 2.5,
    borderColor: '#00A859',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  innerIconGlow: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 168, 89, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  welcomeSub: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00A859',
    letterSpacing: 2.5,
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 34,
    marginBottom: 12,
  },
  highlightName: {
    color: '#34D399',
    fontWeight: '900',
  },
  welcomeDesc: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 32,
    fontWeight: '500',
  },

  // Progress Bar
  progressContainer: {
    width: Math.min(width * 0.6, 220),
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#1E293B',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#00A859',
    borderRadius: 2,
  },
});
