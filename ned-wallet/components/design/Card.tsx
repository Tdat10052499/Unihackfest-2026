import React, { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { elevation, palette, radius, space } from '@/constants/design';
import { PressableScale } from './PressableScale';

/**
 * v2 cards (MotionSurfaces): no outlines; depth from tone and a soft shadow.
 * default = white + S1 · tonal = #F4F4F6 fill on a white surface · accent = white + S-accent (selected / primary)
 * · filled = accent purple. `bordered` and `glass` are deprecated aliases of `default`.
 */
export type CardVariant = 'default' | 'tonal' | 'accent' | 'filled' | 'bordered' | 'glass';

export function Card({
  variant: variantProp,
  // Same padding as before v2 so screens keep their layout: 16 without a variant (was `glass`), 24 with one
  padding = variantProp === undefined || variantProp === 'glass' || variantProp === 'tonal' ? space[4] : space[6],
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
  const variant = variantProp ?? 'default';
  const cardStyle = [styles.base, variants[variant], { padding }, style];
  if (!onPress) return <View style={cardStyle}>{children}</View>;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={cardStyle}>
      {children}
    </PressableScale>
  );
}

const variants = {
  default: [{ backgroundColor: palette.card }, elevation.s1],
  bordered: [{ backgroundColor: palette.card }, elevation.s1],
  glass: [{ backgroundColor: palette.card }, elevation.s1],
  tonal: { backgroundColor: palette.field },
  accent: [{ backgroundColor: palette.card }, elevation.sAccent],
  filled: { backgroundColor: palette.accent },
} as const;

const styles = StyleSheet.create({
  // No overflow hidden: it would cut the soft shadow on iOS
  base: { borderRadius: radius.xl, alignSelf: 'stretch' },
});
