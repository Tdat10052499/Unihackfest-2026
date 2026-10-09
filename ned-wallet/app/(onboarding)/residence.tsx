// Onboarding — Where do you live? (OnbResidence board, step 3 of 3). Sets the money view per wallet:
// Vietnam → amounts in VND, earnings through a payout partner, no crypto balance; outside → USDC (decision D18).
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../services/auth';
import { useRegionStore } from '../../stores/useRegionStore';
import type { Region } from '../../services/milestone/view';
import { OnbScreen, PrimaryButton, StepHeader, onbText } from '../../components/onboarding/ui';
import { FEATURES } from '../../constants/features';
import { elevation, fonts, palette, radius, space } from '../../constants/design';

const OPTIONS: { id: Region; title: string; body: string; badge: string | null }[] = [
  {
    id: 'vn',
    title: 'I live in Vietnam',
    body: "You'll see amounts in VND and receive earnings in your bank account through a payout partner. No crypto balance is shown.",
    badge: 'VN',
  },
  { id: 'intl', title: 'I live outside Vietnam', body: "You'll see USDC and receive earnings in your N.E.D account.", badge: null },
];

export default function ResidenceScreen() {
  const { isReady, isAuthenticated, walletAddress } = useAuth();
  const current = useRegionStore((s) => s.getRegion(walletAddress));
  const setRegion = useRegionStore((s) => s.setRegion);
  const [selected, setSelected] = useState<Region>(current ?? 'vn');

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace('/welcome');
  }, [isReady, isAuthenticated]);

  // D30: residence is the country step (closes D17 together with Settings → Your account)
  if (FEATURES.accountRoles) return <Redirect href="/country" />;

  const confirm = () => {
    if (!walletAddress) return;
    setRegion(walletAddress, selected);
    router.replace('/home');
  };

  return (
    <OnbScreen>
      <StepHeader step={3} total={3} onBack={() => router.replace('/profile')} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
        <Text style={onbText.h1} accessibilityRole="header">
          Where do you live?
        </Text>
        <Text style={[onbText.lead, styles.lead]}>This decides how amounts are shown and where your earnings can go.</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Where you live" style={styles.options}>
          {OPTIONS.map((o) => {
            const on = selected === o.id;
            return (
              <Pressable
                key={o.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setSelected(o.id)}
                style={[styles.option, on ? styles.optionOn : elevation.s1]}
              >
                <View style={styles.optionTop}>
                  <View style={styles.badge}>
                    {o.badge ? <Text style={styles.badgeText}>{o.badge}</Text> : <Feather name="globe" size={18} color={palette.ink} />}
                  </View>
                  <Text style={styles.optionTitle}>{o.title}</Text>
                  <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
                </View>
                <Text style={styles.optionBody}>{o.body}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.later}>
          <Feather name="settings" size={14} color={palette.caption} />
          <Text style={styles.laterText}>You can change this in Settings.</Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton title="Continue" onPress={confirm} disabled={!walletAddress} />
      </View>
    </OnbScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: space[6], paddingTop: 22, paddingBottom: space[4] },
  lead: { marginTop: space[2], color: palette.caption },
  options: { marginTop: space[5], gap: space[3] },
  option: { padding: space[4], borderRadius: radius.xl, backgroundColor: palette.card },
  optionOn: { backgroundColor: palette.tint },
  optionTop: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  badge: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: palette.hoverGround, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.display, fontSize: 15, color: palette.ink },
  optionTitle: { flex: 1, fontFamily: fonts.display, fontSize: 17, color: palette.ink },
  // Radio control: the ring is allowed for radio and switch controls
  radio: { width: 22, height: 22, borderRadius: radius.pill, borderWidth: 2, borderColor: palette.muted, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: palette.link },
  radioDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: palette.link },
  optionBody: { marginTop: 10, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.ink2 },
  later: { marginTop: space[4], flexDirection: 'row', alignItems: 'center', gap: space[2] },
  laterText: { fontFamily: fonts.body, fontSize: 13, color: palette.caption },
  footer: { paddingHorizontal: space[6], paddingTop: space[3], paddingBottom: 28 },
});
