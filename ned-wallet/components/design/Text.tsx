import React from 'react';
import { Text, type TextProps } from 'react-native';
import { colors, light, type, type TypeVariant } from '@/constants/design';

export const tones = {
  primary: colors.text,
  secondary: colors.textSecondary,
  tertiary: colors.textTertiary,
  accent: colors.textAccent,
  success: colors.successText,
  error: colors.errorText,
  warning: colors.warningText,
  info: colors.infoText,
  onLight: light.text,
  onLightSecondary: light.textSecondary,
} as const;
export type Tone = keyof typeof tones;

/** Chữ theo Typography System: `variant` = cấp chữ, `tone` = Text Hierarchy / semantic */
export function DText({
  variant = 'body',
  tone,
  align,
  style,
  ...props
}: TextProps & { variant?: TypeVariant; tone?: Tone; align?: 'left' | 'center' | 'right' }) {
  return (
    <Text
      {...props}
      style={[type[variant], tone && { color: tones[tone] }, align && { textAlign: align }, style]}
    />
  );
}
