import React, { type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, palette, radius, sizes, space, status } from '@/constants/design';
import { PressableScale } from './PressableScale';

// v2 (Main + MotionSurfaces boards): flat fills, no outlines. `outline` is kept as an alias of `secondary`.
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'destructiveSoft';

/** Buttons & pills (Main board): pill, height 52, Inter 16/600, flat fill, no shadow; presses scale to 0.98 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  compact,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ComponentProps<typeof Feather>['name'];
  /** Width of the content instead of the full row */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const inactive = !!disabled || !!loading;
  const look = disabled ? looks.disabled : looks[variant];
  const content: ReactNode = loading ? (
    <ActivityIndicator color={look.fg} />
  ) : (
    <View style={styles.row}>
      {icon ? <Feather name={icon} size={18} color={look.fg} /> : null}
      <Text style={[styles.label, { color: look.fg }]} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      style={[
        styles.base,
        compact ? styles.compact : styles.block,
        { backgroundColor: look.bg },
        style,
      ]}
      pressedStyle={{ backgroundColor: look.pressed }}
    >
      {content}
    </PressableScale>
  );
}

const looks: Record<ButtonVariant | 'disabled', { bg: string; fg: string; pressed: string }> = {
  primary: { bg: palette.accent, fg: palette.onAccent, pressed: palette.accentPressed },
  secondary: { bg: palette.tint, fg: palette.link, pressed: '#ECE3F8' },
  outline: { bg: palette.tint, fg: palette.link, pressed: '#ECE3F8' },
  ghost: { bg: 'transparent', fg: palette.link, pressed: palette.hoverGround },
  destructive: { bg: colors.error, fg: palette.onAccent, pressed: '#B42318' },
  destructiveSoft: { bg: status.error.bg, fg: status.error.ink, pressed: '#FBDADA' },
  disabled: { bg: '#E6E6EB', fg: palette.muted, pressed: '#E6E6EB' },
};

const styles = StyleSheet.create({
  base: {
    height: sizes.button,
    borderRadius: radius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: { alignSelf: 'stretch', paddingHorizontal: space[6] },
  compact: { alignSelf: 'flex-start', paddingHorizontal: space[8] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  label: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 22 },
});
