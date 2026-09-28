// Component onboarding (OnbWelcome / OnbSetup / OnbProfile / OnbMode), dựng trên DesignKit (components/design).
import React, { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Button, IconButton, Notice, Screen } from '@/components/design';
import { colors, fonts, glass, radius, sizes, space, type } from '@/constants/design';
import { onbColors } from './theme';

/** Nền gradient tối + quầng sáng tím; các màn onboarding tự bố cục bên trong */
export function OnbScreen({ children, glow = true }: { children: ReactNode; glow?: boolean }) {
  return (
    <Screen scroll={false} glow={glow} contentStyle={styles.bare}>
      {children}
    </Screen>
  );
}

/** Nút chính (Button System · Primary). Tắt → nền kính, chữ Tertiary */
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

/** Nút trắng "Continue with Google" của OnbWelcome (cao và chữ theo Button System) */
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
        <ActivityIndicator color={onbColors.dark} />
      ) : (
        <>
          <View style={styles.googleMark}>
            <Text style={styles.googleMarkText}>G</Text>
          </View>
          <Text style={[type.button, styles.googleText]}>Continue with Google</Text>
        </>
      )}
    </Pressable>
  );
}

/** Hàng đầu màn: nút back 44px + thanh tiến trình n/total */
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

/** Hộp thông tin (indigo) / cảnh báo (vàng) / lỗi (đỏ) */
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

/** Cỡ chữ onboarding theo Typography System */
export const onbText = StyleSheet.create({
  h1: type.h1,
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
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    shadowColor: colors.brand,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  googleMark: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: onbColors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleMarkText: { fontFamily: fonts.bodySemi, fontSize: 13, color: onbColors.dark },
  googleText: { color: onbColors.dark },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingHorizontal: space[5], paddingTop: space[1] },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  progressSeg: { flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: glass.borderStrong },
  progressSegOn: { backgroundColor: colors.purple[400] },
});
