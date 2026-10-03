// Hidden (refactor-plan PR4, B3): the mode choice is replaced by the residence screen. /mode redirects there; the
// old screen stays below as LegacyModeScreen (not routed).
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../services/auth';
import { useWalletModeStore, type WalletMode } from '../../stores/useWalletModeStore';
import { useRegionStore } from '../../stores/useRegionStore';
import { regionFromMode } from '../../services/onboarding';
import { OnbScreen, PrimaryButton, StepHeader, onbText } from '../../components/onboarding/ui';
import { Badge } from '../../components/design';
import { colors, diagonal, fonts, glass, gradients, radius, shadows, space, type } from '../../constants/design';

const MODES: {
  id: WalletMode;
  title: string;
  desc: string;
  preview: string;
  icon: keyof typeof Feather.glyphMap;
  recommended?: boolean;
}[] = [
  {
    id: 'simple',
    title: 'Simple',
    desc: 'One balance in dollars. We handle the crypto for you.',
    preview: 'Cash in USD',
    icon: 'credit-card',
    recommended: true,
  },
  {
    id: 'crypto',
    title: 'Crypto',
    desc: 'See every token you hold and choose what you pay with.',
    preview: 'SOL · USDC · xStocks',
    icon: 'layers',
  },
];

export default function ModeRoute() {
  return <Redirect href="/residence" />;
}

export function LegacyModeScreen() {
  const { isReady, isAuthenticated, walletAddress } = useAuth();
  const setMode = useWalletModeStore((s) => s.setMode);
  const setRegion = useRegionStore((s) => s.setRegion);
  const [selected, setSelected] = useState<WalletMode>('simple');

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace('/welcome');
  }, [isReady, isAuthenticated]);

  const confirm = () => {
    if (!walletAddress) return;
    setMode(walletAddress, selected);
    setRegion(walletAddress, regionFromMode(selected));
    router.replace('/home');
  };

  return (
    <OnbScreen glow={false}>
      <StepHeader step={2} total={2} />
      <View style={styles.body}>
        <Text style={onbText.h1} accessibilityRole="header">
          How do you want to{'\n'}see your money?
        </Text>
        <Text style={[onbText.lead, styles.lead]}>You can switch anytime from Home.</Text>

        <View accessibilityRole="radiogroup" accessibilityLabel="Wallet mode" style={styles.options}>
          {MODES.map((m) => {
            const on = m.id === selected;
            return (
              <Pressable
                key={m.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setSelected(m.id)}
                style={[styles.option, on ? styles.optionOn : styles.optionOff]}
              >
                <View style={styles.optionRow}>
                  {on ? (
                    <LinearGradient colors={gradients.purpleIndigo} {...diagonal} style={styles.iconBox}>
                      <Feather name={m.icon} size={22} color={colors.text} />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.iconBox, styles.iconBoxOff]}>
                      <Feather name={m.icon} size={22} color={colors.text} />
                    </View>
                  )}
                  <View style={styles.flex}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title}>{m.title}</Text>
                      {m.recommended ? (
                        <Badge label="RECOMMENDED" tone="success" />
                      ) : null}
                    </View>
                    <Text style={styles.desc}>{m.desc}</Text>
                  </View>
                  <View style={[styles.radio, on && styles.radioOn]}>
                    <View style={[styles.radioDot, on && styles.radioDotOn]} />
                  </View>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Home shows</Text>
                  <Text style={styles.preview}>{m.preview}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.flex} />
        <View style={styles.footer}>
          <PrimaryButton title="Continue" onPress={confirm} disabled={!walletAddress} />
        </View>
      </View>
    </OnbScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { flex: 1, paddingHorizontal: space[6], paddingTop: space[6] },
  lead: { marginTop: space[2] },
  options: { marginTop: space[6], gap: space[3] },
  option: { padding: space[4], borderRadius: radius.xl, borderWidth: 1.5 },
  optionOn: { backgroundColor: glass.selectedFill, borderColor: colors.purple[400], boxShadow: shadows.focusRing },
  optionOff: { backgroundColor: glass.fill, borderColor: glass.border },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  iconBox: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  iconBoxOff: { backgroundColor: glass.fillStrong },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  title: { ...type.h3, fontFamily: fonts.display },
  desc: { ...type.body, marginTop: space[1] },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.purple[300] },
  radioDot: { width: 10, height: 10, borderRadius: radius.pill },
  radioDotOn: { backgroundColor: colors.purple[300] },
  previewRow: {
    marginTop: space[4],
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: glass.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: type.caption,
  preview: { ...type.mono, fontFamily: fonts.monoBold },
  footer: { paddingBottom: space[8] },
});
