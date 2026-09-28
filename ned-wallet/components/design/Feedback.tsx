import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, glass, radius, shadows, space } from '@/constants/design';
import { DText } from './Text';

type Status = 'neutral' | 'accent' | 'success' | 'error' | 'warning' | 'info';

const palette: Record<Status, { bg: string; border: string; fg: string }> = {
  neutral: { bg: glass.fillStrong, border: glass.border, fg: colors.textSecondary },
  accent: { bg: glass.accentFill, border: glass.accentBorder, fg: colors.purple[200] },
  success: { bg: glass.successFill, border: glass.successBorder, fg: colors.successText },
  error: { bg: glass.errorFill, border: glass.errorBorder, fg: colors.errorText },
  warning: { bg: glass.warningFill, border: glass.warningBorder, fg: colors.warningText },
  info: { bg: glass.infoFill, border: glass.infoBorder, fg: colors.infoText },
};

/** Nhãn viên thuốc nhỏ (DEVNET, Demo mode, RECOMMENDED, ▲ +1.2%…) */
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
  const p = palette[tone];
  return (
    <View style={[styles.badge, { backgroundColor: p.bg, borderColor: p.border }, style]}>
      {icon ? <Feather name={icon} size={12} color={p.fg} /> : null}
      <DText variant="caption" style={[styles.badgeText, { color: p.fg }]}>
        {label}
      </DText>
    </View>
  );
}

/** Hộp thông tin / cảnh báo / lỗi / thành công */
export function Notice({
  tone = 'info',
  children,
  style,
}: {
  tone?: Exclude<Status, 'neutral' | 'accent'>;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const p = palette[tone];
  const icon = { info: 'info', warning: 'alert-triangle', error: 'alert-circle', success: 'check-circle' } as const;
  return (
    <View style={[styles.notice, { backgroundColor: p.bg, borderColor: p.border }, style]}>
      <Feather name={icon[tone]} size={16} color={p.fg} style={styles.noticeIcon} />
      <View style={styles.flex}>
        {typeof children === 'string' ? <DText variant="caption" tone="primary">{children}</DText> : children}
      </View>
    </View>
  );
}

/** Công tắc bật/tắt (role=switch); bật = gradient NED Primary */
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
      <View style={[styles.knob, value && styles.knobOn]} />
    </Pressable>
  );
}

/** Vòng dấu tick kết quả thành công (XStockSuccess): 88px, nền xanh mờ, vầng sáng 40px */
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
    backgroundColor: glass.successFill,
    borderWidth: 1,
    borderColor: glass.successBorder,
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
    borderWidth: 1,
  },
  badgeText: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 14 },
  notice: {
    flexDirection: 'row',
    gap: space[3],
    alignItems: 'flex-start',
    padding: space[3],
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  noticeIcon: { marginTop: 1 },
  track: {
    width: 50,
    height: 30,
    borderRadius: radius.pill,
    justifyContent: 'center',
    padding: 3,
    backgroundColor: colors.purple[400],
  },
  trackOff: { backgroundColor: glass.toggleOff },
  disabled: { opacity: 0.45 },
  knob: { width: 24, height: 24, borderRadius: radius.pill, backgroundColor: colors.white, boxShadow: shadows.knob },
  knobOn: { alignSelf: 'flex-end' },
});
