// Onboarding — Setting up (OnbSetup): Signed in → Wallet ready → Checking profile (ReverseRecord [b"reverse", wallet]).
// Người quay lại → "Welcome back" → Home (hoặc Mode nếu chưa chọn). Người mới → Fund (thiếu SOL) hoặc Profile.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../services/auth';
import { resolveOnboarding, type OnboardingState } from '../../services/onboarding';
import { MASCOT_IMAGES } from '../../constants/mascot';
import { NoticeCard, OnbScreen, PrimaryButton, onbText } from '../../components/onboarding/ui';
import { onbColors, onbFonts } from '../../components/onboarding/theme';

const RETURNING_AUTO_MS = 1500;

type StepState = 'done' | 'active' | 'waiting';

export default function SetupScreen() {
  const { isReady, isAuthenticated, status, walletAddress, connection, error: authError } = useAuth();
  const [result, setResult] = useState<OnboardingState | null>(null);
  const [checkError, setCheckError] = useState('');
  const checkingFor = useRef<string | null>(null);

  // Chưa đăng nhập → Welcome
  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace('/welcome');
  }, [isReady, isAuthenticated]);

  const check = useCallback(
    async (wallet: string) => {
      checkingFor.current = wallet;
      setCheckError('');
      try {
        const state = await resolveOnboarding(connection, wallet);
        if (checkingFor.current === wallet) setResult(state);
      } catch (err) {
        console.warn('[onboarding] profile check failed:', err);
        checkingFor.current = null;
        setCheckError('Could not reach Solana devnet to check your profile.');
      }
    },
    [connection]
  );

  // Ví sẵn sàng → kiểm tra hồ sơ on-chain (1 lần mỗi ví)
  useEffect(() => {
    if (status !== 'ready' || !walletAddress || checkingFor.current === walletAddress) return;
    const timer = setTimeout(() => check(walletAddress), 0);
    return () => clearTimeout(timer);
  }, [status, walletAddress, check]);

  const next = useCallback(() => {
    if (!result) return;
    router.replace(result.step === 'home' ? '/home' : `/${result.step}`);
  }, [result]);

  // Người quay lại: tự vào ví sau một nhịp để kịp đọc "Welcome back"
  useEffect(() => {
    if (!result?.reverse) return;
    const timer = setTimeout(next, RETURNING_AUTO_MS);
    return () => clearTimeout(timer);
  }, [result, next]);

  const returning = Boolean(result?.reverse);
  const finished = Boolean(result);
  const walletReady = status === 'ready' && Boolean(walletAddress);
  const steps: { label: string; state: StepState }[] = [
    { label: 'Signed in with Google', state: isAuthenticated ? 'done' : 'active' },
    { label: 'Securing your wallet', state: walletReady ? 'done' : isAuthenticated ? 'active' : 'waiting' },
    {
      label: returning ? 'Found your N.E.D profile' : 'Checking for a N.E.D profile',
      state: finished ? 'done' : walletReady ? 'active' : 'waiting',
    },
  ];

  const heading = !finished
    ? 'Setting up your wallet…'
    : returning
      ? `Welcome back, @${result?.reverse?.username}!`
      : 'Your wallet is ready';
  const subheading = !finished
    ? 'This takes a few seconds.'
    : returning
      ? 'Everything is just as you left it.'
      : 'One last step: create your N.E.D profile.';
  const failure = checkError || (status === 'error' ? authError : '');

  return (
    <OnbScreen>
      <View style={styles.body}>
        <Image source={MASCOT_IMAGES.thinking} style={styles.mascot} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Text style={[onbText.h1Center, styles.heading]} accessibilityRole="header" accessibilityLiveRegion="polite">
          {heading}
        </Text>
        <Text style={[onbText.lead, styles.center]}>{subheading}</Text>

        <View accessibilityRole="list" style={styles.steps}>
          {steps.map((s) => (
            <View key={s.label} style={styles.step}>
              {s.state === 'done' ? (
                <View style={styles.doneDot}>
                  <Feather name="check" size={12} color={onbColors.successText} />
                </View>
              ) : s.state === 'active' ? (
                <View style={styles.dot}>
                  <ActivityIndicator size="small" color={onbColors.purple300} />
                </View>
              ) : (
                <View style={[styles.dot, styles.waitingDot]} />
              )}
              <Text
                style={[
                  styles.stepText,
                  s.state === 'active' && styles.stepActive,
                  s.state === 'waiting' && styles.stepWaiting,
                ]}
              >
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.spacer} />

        <View style={styles.footer}>
          {failure ? (
            <>
              <NoticeCard tone="danger" style={styles.errorCard}>
                <Text style={onbText.small}>{failure}</Text>
              </NoticeCard>
              <PrimaryButton title="Try again" onPress={() => walletAddress && check(walletAddress)} />
            </>
          ) : finished ? (
            <PrimaryButton title={returning ? 'Go to my wallet' : 'Continue'} onPress={next} />
          ) : (
            <View style={styles.secure}>
              <Feather name="lock" size={14} color="rgba(255,255,255,0.5)" />
              <Text style={styles.secureText}>Secured with MPC. No recovery phrase to write down.</Text>
            </View>
          )}
        </View>
      </View>
    </OnbScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 70 },
  mascot: { width: 200, height: 156 },
  heading: { marginTop: 26 },
  center: { marginTop: 8, textAlign: 'center' },
  steps: { marginTop: 30, width: '100%', gap: 14 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  waitingDot: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' },
  doneDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(34,197,94,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontFamily: onbFonts.bodyMedium, fontSize: 15, color: onbColors.text },
  stepActive: { fontFamily: onbFonts.bodySemi },
  stepWaiting: { color: 'rgba(255,255,255,0.45)' },
  spacer: { flex: 1 },
  footer: { width: '100%', paddingBottom: 28, minHeight: 84, justifyContent: 'flex-end' },
  errorCard: { marginBottom: 12 },
  secure: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secureText: { fontFamily: onbFonts.body, fontSize: 12, color: 'rgba(255,255,255,0.5)' },
});
