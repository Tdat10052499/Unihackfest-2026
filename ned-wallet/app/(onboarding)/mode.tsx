// Onboarding — Choose mode (OnbMode, bước 2/2): Simple (Recommended) / Crypto → useWalletModeStore (theo ví) → Home.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../services/auth';
import { useWalletModeStore, type WalletMode } from '../../stores/useWalletModeStore';
import { OnbScreen, PrimaryButton, StepHeader, onbText } from '../../components/onboarding/ui';
import { onbColors, onbFonts } from '../../components/onboarding/theme';

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

export default function ModeScreen() {
  const { isReady, isAuthenticated, walletAddress } = useAuth();
  const setMode = useWalletModeStore((s) => s.setMode);
  const [selected, setSelected] = useState<WalletMode>('simple');

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace('/welcome');
  }, [isReady, isAuthenticated]);

  const confirm = () => {
    if (!walletAddress) return;
    setMode(walletAddress, selected);
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
                    <LinearGradient colors={[onbColors.purple, onbColors.indigo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconBox}>
                      <Feather name={m.icon} size={22} color="#FFFFFF" />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.iconBox, styles.iconBoxOff]}>
                      <Feather name={m.icon} size={22} color="#FFFFFF" />
                    </View>
                  )}
                  <View style={styles.flex}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title}>{m.title}</Text>
                      {m.recommended ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>RECOMMENDED</Text>
                        </View>
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
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 22 },
  lead: { marginTop: 8 },
  options: { marginTop: 24, gap: 12 },
  option: { padding: 16, borderRadius: 18, borderWidth: 1.5 },
  optionOn: { backgroundColor: 'rgba(123,47,190,0.2)', borderColor: onbColors.purple400 },
  optionOff: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  iconBoxOff: { backgroundColor: 'rgba(255,255,255,0.08)' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: onbFonts.heading, fontSize: 17, color: onbColors.text },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: 'rgba(74,222,128,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.35)',
  },
  badgeText: { fontFamily: onbFonts.bodyBold, fontSize: 10, letterSpacing: 0.4, color: '#86EFAC' },
  desc: { marginTop: 4, fontFamily: onbFonts.body, fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.7)' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: onbColors.purple300 },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  radioDotOn: { backgroundColor: onbColors.purple300 },
  previewRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: { fontFamily: onbFonts.body, fontSize: 11, color: 'rgba(255,255,255,0.55)' },
  preview: { fontFamily: onbFonts.monoBold, fontSize: 13, color: onbColors.text },
  footer: { paddingBottom: 28 },
});
