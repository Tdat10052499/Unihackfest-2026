// Onboarding — Splash (OnbSplash, variant "mark"): nền tím, icon Teddy nảy vào, ≤1s, không spinner.
// Đã đăng nhập → Setting up (quyết định Home / tạo hồ sơ); chưa → Welcome.
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '../services/auth';
import { MASCOT_IMAGES } from '../constants/mascot';
import { onbFonts } from '../components/onboarding/theme';

const SPLASH_MS = 900;

export default function SplashScreen() {
  const { isAuthenticated } = useAuth();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [icon] = useState(() => new Animated.Value(0));
  const [word] = useState(() => new Animated.Value(0));
  // Đọc trạng thái đăng nhập mới nhất khi hết thời gian splash (không đọc ref trong lúc render)
  const authRef = useRef(isAuthenticated);
  useEffect(() => {
    authRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (cancelled) return;
        setReduceMotion(reduced);
        if (reduced) {
          icon.setValue(1);
          word.setValue(1);
          return;
        }
        Animated.parallel([
          Animated.timing(icon, { toValue: 1, duration: 600, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
          Animated.timing(word, { toValue: 1, duration: 400, delay: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]).start();
      })
      .catch(() => {
        icon.setValue(1);
        word.setValue(1);
      });
    const timer = setTimeout(() => router.replace(authRef.current ? '/setup' : '/welcome'), SPLASH_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Chạy một lần khi mở app
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iconStyle = reduceMotion
    ? undefined
    : {
        opacity: icon,
        transform: [{ scale: icon.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }],
      };
  const wordStyle = reduceMotion
    ? undefined
    : { opacity: word, transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="N.E.D. Tap to continue"
      onPress={() => router.replace(isAuthenticated ? '/setup' : '/welcome')}
      style={styles.fill}
    >
      <LinearGradient
        colors={['#8A3AD0', '#7B2FBE', '#5A1D9E', '#3A1170']}
        locations={[0, 0.38, 0.72, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.fill}
      >
        <View style={styles.center}>
          <Animated.View style={[styles.iconBox, iconStyle]}>
            <Image source={MASCOT_IMAGES.lineArt} style={styles.icon} resizeMode="contain" accessibilityIgnoresInvertColors />
          </Animated.View>
          <Animated.View style={wordStyle}>
            <Text style={styles.word}>N.E.D</Text>
          </Animated.View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -40 },
  iconBox: {
    width: 128,
    height: 128,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E0646',
    shadowOpacity: 0.45,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 18 },
    elevation: 10,
  },
  icon: { width: 98, height: 100 },
  word: {
    marginTop: 28,
    fontFamily: onbFonts.heading,
    fontSize: 34,
    letterSpacing: 8,
    paddingLeft: 8,
    color: '#FFFFFF',
  },
});
