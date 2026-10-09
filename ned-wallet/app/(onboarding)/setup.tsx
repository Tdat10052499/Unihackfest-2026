// Onboarding — Setting up (OnbSetup): Signed in → Wallet ready → Checking profile (ReverseRecord [b"reverse", wallet]).
// Returning user → "Welcome back" → Home (or the next onboarding step). New user → Fund (short of SOL) or Profile.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../services/auth';
import { onboardingRoute, resolveOnboarding, type OnboardingState } from '../../services/onboarding';
import { MASCOT_IMAGES } from '../../constants/mascot';
import { NoticeCard, OnbScreen, PrimaryButton, onbText } from '../../components/onboarding/ui';
import { colors, fonts, glass, radius, sizes, space, type } from '../../constants/design';

const RETURNING_AUTO_MS = 1500;

type StepState = 'done' | 'active' | 'waiting';

export default function SetupScreen() {
  const { isReady, isAuthenticated, status, walletAddress, connection, error: authError } = useAuth();
  const [result, setResult] = useState<OnboardingState | null>(null);
  const [checkError, setCheckError] = useState('');
  const checkingFor = useRef<string | null>(null);

  // Not signed in → Welcome
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

  // Wallet ready → check the on-chain profile (once per wallet)
  useEffect(() => {
    if (status !== 'ready' || !walletAddress || checkingFor.current === walletAddress) return;
    const timer = setTimeout(() => check(walletAddress), 0);
    return () => clearTimeout(timer);
  }, [status, walletAddress, check]);

  const next = useCallback(() => {
    if (!result) return;
    router.replace(onboardingRoute(result.step, result.update) as never);
  }, [result]);

  // Returning user: enter the wallet after a beat, so "Welcome back" can be read
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
    { label: 'Creating your wallet', state: walletReady ? 'done' : isAuthenticated ? 'active' : 'waiting' },
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
                  <Feather name="check" size={12} color={colors.successText} />
                </View>
              ) : s.state === 'active' ? (
                <View style={styles.dot}>
                  <ActivityIndicator size="small" color={colors.purple[300]} />
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
              <Feather name="lock" size={14} color={colors.textTertiary} />
              <Text style={styles.secureText}>Your key is managed by Dynamic (MPC). No recovery phrase to write down.</Text>
            </View>
          )}
        </View>
      </View>
    </OnbScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', paddingHorizontal: space[8], paddingTop: space[16] },
  mascot: { width: 200, height: 156 },
  heading: { marginTop: space[6] },
  center: { marginTop: space[2], textAlign: 'center' },
  steps: { marginTop: space[8], width: '100%', gap: space[4] },
  step: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  dot: { width: 24, height: 24, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  waitingDot: { borderWidth: 2, borderColor: glass.borderStrong },
  doneDot: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: glass.successFill,
    borderWidth: 1,
    borderColor: glass.successBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { ...type.bodyLarge, fontFamily: fonts.bodyMedium },
  stepActive: { fontFamily: fonts.bodySemi },
  stepWaiting: { color: colors.textTertiary },
  spacer: { flex: 1 },
  footer: { width: '100%', paddingBottom: space[8], minHeight: 84, justifyContent: 'flex-end' },
  errorCard: { marginBottom: space[3] },
  secure: { height: sizes.button, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2] },
  secureText: type.caption,
});
