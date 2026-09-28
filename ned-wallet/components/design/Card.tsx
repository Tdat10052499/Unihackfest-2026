import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, diagonal, glass, gradients, radius, space } from '@/constants/design';

export type CardVariant = 'default' | 'bordered' | 'accent' | 'filled' | 'glass';

/**
 * Card & Radius System (PDF trang 6): bo 20.
 * default = Surface 2, padding 24 · bordered = viền #353540 · accent = nền tím mờ, viền purple/30%
 * · filled = gradient đầy (hero) · glass = lớp kính trên nền gradient của màn.
 */
export function Card({
  variant = 'glass',
  padding = variant === 'glass' ? space[4] : space[6],
  onPress,
  accessibilityLabel,
  style,
  children,
}: {
  variant?: CardVariant;
  padding?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const body = (
    <>
      {variant === 'filled' ? (
        <LinearGradient colors={gradients.primary} {...diagonal} style={StyleSheet.absoluteFill} />
      ) : variant === 'accent' ? (
        <LinearGradient colors={gradients.accentCard} {...diagonal} style={StyleSheet.absoluteFill} />
      ) : null}
      {children}
    </>
  );
  const cardStyle = [styles.base, variants[variant], { padding }, style];
  if (!onPress) return <View style={cardStyle}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const variants = StyleSheet.create({
  default: { backgroundColor: colors.surface2 },
  bordered: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  accent: { borderWidth: 1, borderColor: glass.accentBorder },
  filled: { backgroundColor: colors.brand },
  glass: { backgroundColor: glass.fill, borderWidth: 1, borderColor: glass.border },
});

const styles = StyleSheet.create({
  base: { borderRadius: radius.xl, overflow: 'hidden', alignSelf: 'stretch' },
  pressed: { opacity: 0.85 },
});
