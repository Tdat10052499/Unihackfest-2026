// Onboarding — Welcome (OnbWelcome): Teddy vẫy tay, 3 lợi ích, chỉ "Continue with Google".
// Web: login() chuyển sang trang Google rồi quay về đây; khi đã đăng nhập → Setting up.
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../services/auth';
import { MASCOT_IMAGES } from '../../constants/mascot';
import { GoogleButton, NoticeCard, OnbScreen, onbText } from '../../components/onboarding/ui';
import { onbColors, onbFonts } from '../../components/onboarding/theme';

// "No network fees, ever" trong thiết kế đã bỏ: không có gas sponsorship (docs/04-ke-hoach-code.md, Cập nhật sau Phase 0)
const BENEFITS: { icon: keyof typeof Feather.glyphMap; text: string }[] = [
  { icon: 'phone', text: 'Send money with a phone number' },
  { icon: 'trending-up', text: 'Own US stocks from just $1' },
  { icon: 'lock', text: 'Your own wallet — no seed phrase' },
];

export default function WelcomeScreen() {
  const { isAuthenticated, status, error, login } = useAuth();
  const [starting, setStarting] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Quay về từ Google (web) hoặc phiên còn hạn → Setting up
  useEffect(() => {
    if (isAuthenticated) router.replace('/setup');
  }, [isAuthenticated]);

  const handleLogin = async () => {
    setLoginError('');
    setStarting(true);
    try {
      await login();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Could not sign in with Google. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const shownError = loginError || (status === 'error' || status === 'unconfigured' ? error : '');

  return (
    <OnbScreen>
      <View style={styles.body}>
        <View style={styles.mascotWrap}>
          <Image
            source={MASCOT_IMAGES.waving}
            style={styles.mascot}
            resizeMode="contain"
            accessibilityLabel="Teddy, the N.E.D bear, waving hello"
          />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Your money,{'\n'}made simple.
        </Text>
        <Text style={[onbText.lead, styles.subtitle]}>Send, save and invest in US stocks. No crypto jargon.</Text>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.text} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Feather name={b.icon} size={17} color={onbColors.lavender} />
              </View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.spacer} />

        {shownError ? (
          <NoticeCard tone="danger" style={styles.error}>
            <Text style={onbText.small}>{shownError}</Text>
          </NoticeCard>
        ) : null}
        <GoogleButton onPress={handleLogin} loading={starting || status === 'initializing'} />
        <Text style={[onbText.caption, styles.terms]}>By continuing you agree to our Terms and Privacy Policy.</Text>
      </View>
    </OnbScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 24 },
  mascotWrap: { alignItems: 'center', paddingTop: 28 },
  mascot: { width: 210, height: 160 },
  title: {
    marginTop: 26,
    fontFamily: onbFonts.heading,
    fontSize: 34,
    lineHeight: 37,
    letterSpacing: -1,
    color: onbColors.text,
  },
  subtitle: { marginTop: 12, fontSize: 15, lineHeight: 22 },
  benefits: { marginTop: 24, gap: 12 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(155,79,222,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(155,79,222,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: { fontFamily: onbFonts.bodyMedium, fontSize: 14, color: 'rgba(255,255,255,0.88)' },
  spacer: { flex: 1, minHeight: 24 },
  error: { marginBottom: 12 },
  terms: { marginTop: 14, marginBottom: 28 },
});
