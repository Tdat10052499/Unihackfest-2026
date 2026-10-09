// Onboarding pieces (OnbWelcome / OnbSetup / OnbConsent / OnbProfile / OnbResidence boards) on the v2 DesignKit.
import React, { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Button, IconButton, Notice, Screen } from '@/components/design';
import { colors, fonts, palette, radius, sizes, space, type } from '@/constants/design';

/** Onboarding frame: ground background, the screen lays out its own content */
export function OnbScreen({ children }: { children: ReactNode }) {
  return (
    <Screen scroll={false} contentStyle={styles.bare}>
      {children}
    </Screen>
  );
}

/** Primary pill (Main board) */
export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return <Button title={title} onPress={onPress} disabled={disabled} loading={loading} style={style} />;
}

/** "Continue with Google" of OnbWelcome: ink pill, white G mark */
export function GoogleButton({ onPress, loading }: { onPress: () => void; loading?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: !!loading }}
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
    >
      {loading ? (
        <ActivityIndicator color={palette.onAccent} />
      ) : (
        <>
          <View style={styles.googleMark}>
            <Text style={styles.googleMarkText}>G</Text>
          </View>
          <Text style={styles.googleText}>Continue with Google</Text>
        </>
      )}
    </Pressable>
  );
}

/** Top row: 44 px back button (white, S1) + n/total progress segments */
export function StepHeader({ step, total, onBack }: { step: number; total: number; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      {onBack ? <IconButton icon="chevron-left" accessibilityLabel="Back" onPress={onBack} /> : null}
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`Step ${step} of ${total}`}
        accessibilityValue={{ min: 1, max: total, now: step }}
        style={styles.progress}
      >
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.progressSeg, i < step && styles.progressSegOn]} />
        ))}
      </View>
    </View>
  );
}

/** Info (indigo) / warning (yellow) / error (red) box */
export function NoticeCard({
  tone = 'info',
  children,
  style,
}: {
  tone?: 'info' | 'warning' | 'danger';
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Notice tone={tone === 'danger' ? 'error' : tone} style={style}>
      {children}
    </Notice>
  );
}

/** Onboarding text sizes from the typography system */
export const onbText = StyleSheet.create({
  /** Board H1: Space Grotesk 28/700 */
  h1: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.4, color: palette.ink },
  h1Center: { ...type.h2, textAlign: 'center' },
  lead: type.body,
  label: { ...type.body, fontFamily: fonts.bodyMedium, color: colors.text },
  small: { ...type.caption, color: colors.textSecondary },
  caption: { ...type.caption, textAlign: 'center' },
  mono: type.mono,
});

const styles = StyleSheet.create({
  bare: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  pressed: { opacity: 0.85 },
  googleButton: {
    height: sizes.button,
    borderRadius: radius.pill,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
  },
  googleMark: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleMarkText: { fontFamily: fonts.bodySemi, fontWeight: '700', fontSize: 13, color: palette.ink },
  googleText: { fontFamily: fonts.bodySemi, fontSize: 16, color: palette.onAccent },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingHorizontal: space[5], paddingTop: space[1] },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  progressSeg: { flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: palette.hoverGround },
  progressSegOn: { backgroundColor: palette.accent },
});
