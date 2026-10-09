import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, palette, radius, shadows, space, status } from '@/constants/design';
import { cssEasing, duration, useMotion } from '@/constants/motion';
import { DText } from './Text';

type Status = 'neutral' | 'accent' | 'success' | 'error' | 'warning' | 'info';

/** Status tints (no outlines in v2): background + ink */
const tints: Record<Status, { bg: string; fg: string }> = {
  neutral: { bg: status.neutral.bg, fg: status.neutral.ink },
  accent: { bg: status.accent.bg, fg: status.accent.ink },
  success: { bg: status.success.bg, fg: status.success.ink },
  error: { bg: status.error.bg, fg: status.error.ink },
  warning: { bg: status.warning.bg, fg: status.warning.ink },
  info: { bg: status.info.bg, fg: status.info.ink },
};

/** Small pill label (DEVNET, Demo mode, RECOMMENDED, ▲ +1.2%…) */
export function Badge({
  label,
  tone = 'neutral',
  icon,
  style,
}: {
  label: string;
  tone?: Status;
  icon?: React.ComponentProps<typeof Feather>['name'];
  style?: StyleProp<ViewStyle>;
}) {
  const p = tints[tone];
  return (
    <View style={[styles.badge, { backgroundColor: p.bg }, style]}>
      {icon ? <Feather name={icon} size={12} color={p.fg} /> : null}
      <DText variant="caption" style={[styles.badgeText, { color: p.fg }]}>
        {label}
      </DText>
    </View>
  );
}

/** Info / warning / error / success box */
export function Notice({
  tone = 'info',
  children,
  style,
}: {
  tone?: Exclude<Status, 'neutral' | 'accent'>;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const p = tints[tone];
  const icon = { info: 'info', warning: 'alert-triangle', error: 'alert-circle', success: 'check-circle' } as const;
  return (
    <View style={[styles.notice, { backgroundColor: p.bg }, style]}>
      <Feather name={icon[tone]} size={16} color={p.fg} style={styles.noticeIcon} />
      <View style={styles.flex}>
        {typeof children === 'string' ? <DText variant="caption" tone="primary">{children}</DText> : children}
      </View>
    </View>
  );
}

/** Switch (role=switch): accent track when on; the knob slides with a transform transition (instant with Reduce Motion) */
export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
  disabled,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}) {
  const { ms } = useMotion();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[styles.track, !value && styles.trackOff, disabled && styles.disabled]}
      hitSlop={6}
    >
      <Animated.View
        style={[
          styles.knob,
          {
            transform: [{ translateX: value ? 20 : 0 }],
            transitionProperty: 'transform',
            transitionDuration: ms(duration.stateChange),
            transitionTimingFunction: cssEasing.out,
          },
        ]}
      />
    </Pressable>
  );
}

/** Success tick ring: 88px, faint green fill, 40px glow */
export function SuccessMark({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.success, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Feather name="check" size={40} color={colors.successText} />
    </View>
  );
}

const styles = StyleSheet.create({
  success: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: status.success.bg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    boxShadow: shadows.successGlow,
  },
  flex: { flex: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[1],
    paddingHorizontal: space[2],
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 14 },
  notice: {
    flexDirection: 'row',
    gap: space[3],
    alignItems: 'flex-start',
    padding: space[3],
    borderRadius: radius.lg,
  },
  noticeIcon: { marginTop: 1 },
  track: {
    width: 50,
    height: 30,
    borderRadius: radius.pill,
    justifyContent: 'center',
    padding: 3,
    backgroundColor: palette.accent,
  },
  trackOff: { backgroundColor: palette.switchOff },
  disabled: { opacity: 0.45 },
  knob: { width: 24, height: 24, borderRadius: radius.pill, backgroundColor: colors.white, boxShadow: shadows.knob },
});
