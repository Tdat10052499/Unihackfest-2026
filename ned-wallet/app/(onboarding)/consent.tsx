// Onboarding — Your consent (OnbConsent board, step 1 of 3). Separate from the Terms; not ticked by default.
// The choice is logged on this device (@ned_consent_v1: time, scope, version, wallet) — Decree 356/2025 Art. 6.
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../services/auth';
import { useConsentStore } from '../../stores/useConsentStore';
import { OnbScreen, PrimaryButton, StepHeader, onbText } from '../../components/onboarding/ui';
import { fonts, palette, radius, space } from '../../constants/design';

/** What the consent covers (stored with the log) */
export const CONSENT_SCOPE = ['google-account-name', 'email', 'wallet-address', 'login-provider-dynamic-us'];

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

export default function ConsentScreen() {
  const { isReady, isAuthenticated, user, walletAddress } = useAuth();
  const accept = useConsentStore((s) => s.accept);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace('/welcome');
  }, [isReady, isAuthenticated]);

  const agree = () => {
    if (!walletAddress || !checked) return;
    accept(walletAddress, CONSENT_SCOPE);
    router.replace('/setup'); // setup decides the next step (profile, or residence for a returning wallet)
  };

  const rows: [string, string, boolean?][] = [
    ['Google account name', 'From Google'],
    ['Email', user?.email ?? '—'],
    ['Wallet address', walletAddress ? short(walletAddress) : '—', true],
    ['Login provider', 'Dynamic · United States'],
  ];

  return (
    <OnbScreen glow={false}>
      <StepHeader step={1} total={3} onBack={() => router.replace('/welcome')} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
        <Text style={onbText.h1} accessibilityRole="header">
          Your consent
        </Text>
        <Text style={[onbText.lead, styles.lead]}>This is separate from the Terms. We need it before we create your account.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What we process</Text>
          <View accessibilityRole="list" style={styles.list}>
            {rows.map(([k, v, mono]) => (
              <View key={k} style={styles.row}>
                <Text style={styles.key}>{k}</Text>
                <Text style={[styles.value, mono && styles.mono]} numberOfLines={1}>
                  {v}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          onPress={() => setChecked((c) => !c)}
          style={[styles.box, checked && styles.boxOn]}
        >
          <View style={[styles.tick, checked && styles.tickOn]}>{checked ? <Feather name="check" size={16} color={palette.onAccent} /> : null}</View>
          <Text style={styles.boxText}>
            I agree that N.E.D processes my Google account name, email and wallet address to run my account, and that my
            login is handled by Dynamic in the United States. I can withdraw consent in Settings.
          </Text>
        </Pressable>

        <Text style={styles.note}>
          Not ticked by default. You can read the Terms, Privacy Policy and{' '}
          <Text style={styles.link} onPress={() => router.push('/disclosures')} accessibilityRole="link">
            Disclosures
          </Text>{' '}
          before you agree.
        </Text>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton title="Agree and continue" onPress={agree} disabled={!checked || !walletAddress} />
        {!checked ? <Text style={styles.footHint}>Tick the box to continue</Text> : null}
      </View>
    </OnbScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: space[6], paddingTop: 22, paddingBottom: space[4] },
  lead: { marginTop: space[2], color: palette.caption },
  card: { marginTop: space[5], padding: space[4], borderRadius: radius.xl, backgroundColor: palette.card },
  cardTitle: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.caption, marginBottom: space[3] },
  list: { gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[3] },
  key: { fontFamily: fonts.body, fontSize: 14, color: palette.caption },
  value: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink, flexShrink: 1, textAlign: 'right' },
  mono: { fontFamily: fonts.monoBold, fontSize: 13 },
  box: { marginTop: space[4], flexDirection: 'row', gap: 14, padding: space[4], borderRadius: 18, backgroundColor: palette.card },
  boxOn: { backgroundColor: palette.tint },
  // The checkbox square is a control (like radio and switch), the one place a ring is allowed
  tick: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: palette.muted, alignItems: 'center', justifyContent: 'center' },
  tickOn: { backgroundColor: palette.accent, borderColor: palette.accent },
  boxText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.ink },
  note: { marginTop: space[3], fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: palette.caption },
  link: { color: palette.link, fontFamily: fonts.bodySemi },
  footer: { paddingHorizontal: space[6], paddingTop: space[3], paddingBottom: 28 },
  footHint: { marginTop: space[2], textAlign: 'center', fontFamily: fonts.body, fontSize: 12, color: palette.caption },
});
