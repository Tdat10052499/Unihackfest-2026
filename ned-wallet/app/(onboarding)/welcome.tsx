import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MASCOT_IMAGES } from '../../constants/mascot';

const { width } = Dimensions.get('window');

// Component đục lỗ cuống vé (TicketCutout)
const TicketCutout = ({
  size,
  left,
  right,
  transformX,
  bottomOffset = -3,
}: {
  size: number;
  left?: number | string;
  right?: number | string;
  transformX?: number;
  bottomOffset?: number;
}) => {
  return (
    <View
      style={{
        position: 'absolute',
        bottom: bottomOffset,
        ...(left !== undefined ? { left } : {}),
        ...(right !== undefined ? { right } : {}),
        ...(transformX !== undefined ? { transform: [{ translateX: transformX }] } : {}),
        width: size,
        height: size / 2 + 3,
        overflow: 'hidden',
        zIndex: 10,
      } as any}
      pointerEvents="none"
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#FDF8F5',
          borderWidth: 3,
          borderColor: '#000',
        }}
      />
    </View>
  );
};

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
        duration: 600,
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
        delay: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Tự động điều hướng vào ví chính sau 2200ms
    const redirectTimer = setTimeout(() => {
      console.log('🚀 [Onboarding Welcome] Hoàn tất, điều hướng vào Home...');
      router.replace('/home');
    }, 2200);

    return () => clearTimeout(redirectTimer);
  }, [fadeAnim, scaleAnim, badgeScaleAnim, router]);

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FDF8F5" />

      <View style={styles.contentContainer}>
        {/* Animated Ticket Container */}
        <Animated.View
          style={[
            styles.ticketWrapper,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Hard shadow */}
          <View style={styles.ticketShadow} />

          {/* Ticket Body */}
          <View style={styles.ticketBody}>
            {/* Animated Mascot Badge */}
            <Animated.View
              style={[
                styles.mascotBadge,
                {
                  transform: [{ scale: badgeScaleAnim }],
                },
              ]}
            >
              <Image
                source={MASCOT_IMAGES.exciting}
                style={styles.mascotImage}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Greeting & Welcome Title */}
            <View style={styles.congratsBadge}>
              <Ionicons name="sparkles" size={14} color="#000" style={{ marginRight: 4 }} />
              <Text style={styles.congratsBadgeText}>CHÚC MỪNG BẠN</Text>
            </View>

            <Text style={styles.welcomeTitle}>
              Ví <Text style={styles.highlightName}>@{name}.sol</Text> đã sẵn sàng!
            </Text>

            <Text style={styles.welcomeDesc}>
              Tài khoản định danh ví của bạn đã được kích hoạt thành công. Đang đưa bạn vào N.E.D Wallet...
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
          </View>

          {/* Cutouts */}
          <TicketCutout size={26} left={24} />
          <TicketCutout size={42} left="50%" transformX={-21} />
          <TicketCutout size={26} right={24} />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FDF8F5',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  ticketWrapper: {
    width: '100%',
    position: 'relative',
    marginBottom: 20,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: 'center',
    zIndex: 2,
  },

  mascotBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFD54F',
    borderWidth: 3,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  mascotImage: {
    width: 68,
    height: 68,
  },

  congratsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E5FF',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
  },
  congratsBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Black',
    color: '#000',
    letterSpacing: 1,
  },

  welcomeTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Black',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  highlightName: {
    color: '#8A2BE2',
  },
  welcomeDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
    marginBottom: 24,
    fontFamily: 'Inter-Medium',
  },

  // Progress Bar
  progressContainer: {
    width: Math.min(width * 0.6, 200),
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#FAF6F0',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#00E5FF',
    borderRadius: 4,
  },
});
