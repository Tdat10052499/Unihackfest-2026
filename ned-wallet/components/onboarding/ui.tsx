// Component nhỏ dùng chung cho onboarding (theo OnbWelcome / OnbSetup / OnbProfile / OnbMode).
import React, { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { onbBackground, onbColors, onbFonts, onbPrimaryGradient } from './theme';

/** Nền gradient tối + quầng sáng tím phía trên, nội dung giới hạn 480px để web desktop không bị kéo giãn */
export function OnbScreen({ children, glow = true }: { children: ReactNode; glow?: boolean }) {
  return (
    <LinearGradient
      colors={onbBackground.colors}
      locations={onbBackground.locations}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={styles.fill}
    >
      {glow ? <View pointerEvents="none" style={styles.glow} /> : null}
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.column}>{children}</View>
      </SafeAreaView>
    </LinearGradient>
  );
}

/** Nút chính gradient (56px, bo 16). Tắt → nền xám như bản thiết kế */
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
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [styles.buttonShell, pressed && !inactive && styles.pressed, style]}
    >
      {disabled && !loading ? (
        <View style={[styles.button, styles.buttonDisabled]}>
          <Text style={[styles.buttonText, styles.buttonTextDisabled]}>{title}</Text>
        </View>
      ) : (
        <LinearGradient colors={onbPrimaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{title}</Text>}
        </LinearGradient>
      )}
    </Pressable>
  );
}

/** Nút trắng "Continue with Google" của OnbWelcome */
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
          <Text style={styles.googleText}>Continue with Google</Text>
        </>
      )}
    </Pressable>
  );
}

/** Hàng đầu màn: nút back 44px + thanh tiến trình n/total */
export function StepHeader({ step, total, onBack }: { step: number; total: number; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.back}>
          <Feather name="chevron-left" size={20} color="rgba(255,255,255,0.7)" />
        </Pressable>
      ) : null}
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
  const palette = {
    info: { bg: 'rgba(99,102,241,0.1)', border: 'rgba(129,140,248,0.26)', icon: '#A5B4FC', name: 'info' as const },
    warning: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(251,191,36,0.35)', icon: onbColors.warning, name: 'alert-triangle' as const },
    danger: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(248,113,113,0.45)', icon: onbColors.danger, name: 'alert-circle' as const },
  }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: palette.bg, borderColor: palette.border }, style]}>
      <Feather name={palette.name} size={16} color={palette.icon} style={styles.noticeIcon} />
      <View style={styles.flex}>{children}</View>
    </View>
  );
}

export const onbText = StyleSheet.create({
  h1: { fontFamily: onbFonts.heading, fontSize: 28, lineHeight: 32, letterSpacing: -0.6, color: onbColors.text },
  h1Center: { fontFamily: onbFonts.heading, fontSize: 24, lineHeight: 30, color: onbColors.text, textAlign: 'center' },
  lead: { fontFamily: onbFonts.body, fontSize: 14, lineHeight: 21, color: onbColors.textMuted },
  label: { fontFamily: onbFonts.bodySemi, fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  small: { fontFamily: onbFonts.body, fontSize: 12, lineHeight: 18, color: 'rgba(255,255,255,0.78)' },
  caption: { fontFamily: onbFonts.body, fontSize: 11, lineHeight: 16, color: onbColors.textSubtle, textAlign: 'center' },
  mono: { fontFamily: onbFonts.mono, fontSize: 13, color: onbColors.text },
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  glow: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    width: 400,
    height: 380,
    borderRadius: 200,
    backgroundColor: 'rgba(123,47,190,0.22)',
    opacity: 0.9,
    transform: [{ scaleX: 1.1 }],
  },
  safe: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  buttonShell: { borderRadius: 16, overflow: 'hidden' },
  pressed: { opacity: 0.85 },
  button: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  buttonText: { fontFamily: onbFonts.heading, fontSize: 17, color: '#FFFFFF' },
  buttonTextDisabled: { color: 'rgba(255,255,255,0.4)' },
  googleButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#7B2FBE',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  googleMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: onbColors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleMarkText: { fontFamily: onbFonts.bodyBold, fontSize: 13, color: onbColors.dark },
  googleText: { fontFamily: onbFonts.heading, fontSize: 17, color: onbColors.dark },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 4 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  progressSeg: { flex: 1, height: 4, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.12)' },
  progressSegOn: { backgroundColor: onbColors.purple400 },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 14, borderWidth: 1 },
  noticeIcon: { marginTop: 1 },
});
