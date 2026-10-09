// Onboarding — Welcome (OnbWelcome board): illustration, title, three points, only "Continue with Google".
// Web: login() goes to the Google page and comes back here; once signed in → Setting up.
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../services/auth';
import { MASCOT_IMAGES } from '../../constants/mascot';
import { GoogleButton, NoticeCard, OnbScreen, onbText } from '../../components/onboarding/ui';
import { fonts, palette, space } from '../../constants/design';

// OnbWelcome copy (product-spec section 6 words: lock, release, refund; never pay / escrow / safe)
const BENEFITS: { icon: keyof typeof Feather.glyphMap; text: string }[] = [
  { icon: 'lock', text: 'Clients lock the money for each milestone' },
  { icon: 'globe', text: 'Receive VND in Vietnam, or USDC abroad' },
  { icon: 'clock', text: 'Refund or release by deadline, written in code' },
];

export default function WelcomeScreen() {
  const { isAuthenticated, status, error, login } = useAuth();
  const [starting, setStarting] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Back from Google (web) or a session still valid → Setting up
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
    <OnbScreen glow={false}>
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
          Get your earnings locked before you start.
        </Text>
        <Text style={styles.subtitle}>Milestone contracts for freelancers and their clients abroad.</Text>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.text} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Feather name={b.icon} size={17} color={palette.link} />
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
        <Text style={styles.terms}>By continuing you agree to the Terms. Read the Privacy notice; we ask for your consent next.</Text>
      </View>
    </OnbScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: space[6] },
  mascotWrap: { height: 220, borderRadius: 28, backgroundColor: '#EDE3FB', alignItems: 'center', justifyContent: 'center', marginTop: space[4] },
  mascot: { width: 230, height: 180 },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 37, letterSpacing: -0.6, color: palette.ink, marginTop: space[6] },
  subtitle: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, marginTop: space[3], color: palette.caption },
  benefits: { marginTop: space[6], gap: space[3] },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  benefitIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: palette.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, color: palette.ink, flex: 1 },
  spacer: { flex: 1, minHeight: space[6] },
  error: { marginBottom: space[3] },
  terms: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: palette.caption, textAlign: 'center', marginTop: space[3], marginBottom: space[6] },
});
