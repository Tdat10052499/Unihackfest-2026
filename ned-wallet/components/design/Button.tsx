import React, { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, diagonal, glass, gradients, radius, sizes, space, type } from '@/constants/design';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';

/** Button System (PDF trang 6): cao 52, bo 16, Space Grotesk 16/600 */
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
  /** Nút ngang theo nội dung thay vì kéo hết chiều rộng */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const inactive = !!disabled || !!loading;
  const textColor = disabled
    ? colors.textTertiary
    : variant === 'outline' || variant === 'ghost'
      ? colors.textAccent
      : colors.text;
  const content: ReactNode = loading ? (
    <ActivityIndicator color={textColor} />
  ) : (
    <View style={styles.row}>
      {icon ? <Feather name={icon} size={18} color={textColor} /> : null}
      <Text style={[type.button, { color: textColor }]} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        compact ? styles.compact : styles.block,
        !disabled && variantStyle[variant],
        disabled && styles.disabled,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {variant === 'primary' && !disabled ? (
        <LinearGradient colors={gradients.primary} {...diagonal} style={StyleSheet.absoluteFill} />
      ) : null}
      {content}
    </Pressable>
  );
}

const variantStyle = StyleSheet.create({
  primary: { backgroundColor: colors.brand },
  secondary: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.brand },
  ghost: { backgroundColor: 'transparent' },
  destructive: { backgroundColor: colors.error },
});

const styles = StyleSheet.create({
  base: {
    height: sizes.button,
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: { alignSelf: 'stretch', paddingHorizontal: space[6] },
  compact: { alignSelf: 'flex-start', paddingHorizontal: space[8] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  disabled: { backgroundColor: glass.fillStrong },
  pressed: { opacity: 0.85 },
});
