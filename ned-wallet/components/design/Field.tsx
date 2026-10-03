// Text field of the Motion & surfaces board: filled #F4F4F6 (white when it sits on the ground), radius 12, height 48, no border. Focus turns the fill
// white and fades in a purple halo (opacity only, 180 ms); an error tints the fill red and shows the message below.
import React, { forwardRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { fonts, palette, radius, shadows, space, status } from '@/constants/design';
import { cssEasing, duration, useMotion } from '@/constants/motion';
import { DText } from './Text';

export interface FieldProps extends TextInputProps {
  label?: string;
  /** Help text under the field (hidden while an error shows) */
  hint?: string;
  /** Error sentence: tints the field and replaces the hint */
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  /** What the field sits on: 'card' (default, #F4F4F6 fill as on the boards) or 'ground' (white fill on the screen background) */
  on?: 'card' | 'ground';
}

export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, hint, error, containerStyle, style, onFocus, onBlur, multiline, on = 'card', ...props },
  ref
) {
  const [focused, setFocused] = useState(false);
  const { ms } = useMotion();
  const rest = on === 'ground' ? palette.card : palette.field;
  const fill = error ? status.error.bg : focused ? palette.card : rest;
  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <DText variant="caption" tone="secondary" style={styles.label}>
          {label}
        </DText>
      ) : null}
      <View style={[styles.box, multiline && styles.multiline, { backgroundColor: fill }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.halo,
            {
              opacity: focused && !error ? 1 : 0,
              transitionProperty: 'opacity',
              transitionDuration: ms(duration.fieldFocus),
              transitionTimingFunction: cssEasing.standard,
            },
          ]}
        />
        <TextInput
          ref={ref}
          {...props}
          multiline={multiline}
          placeholderTextColor={palette.muted}
          accessibilityLabel={props.accessibilityLabel ?? label}
          accessibilityHint={error ?? hint}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.inputMultiline, style]}
        />
      </View>
      {error ? (
        <DText variant="caption" tone="error" style={styles.below} accessibilityLiveRegion="polite">
          {error}
        </DText>
      ) : hint ? (
        <DText variant="caption" tone="secondary" style={styles.below}>
          {hint}
        </DText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch' },
  label: { marginBottom: space[1] },
  box: { minHeight: 48, borderRadius: radius.md, justifyContent: 'center' },
  multiline: { minHeight: 96, justifyContent: 'flex-start' },
  // Halo = a shadow ring around the field; only its opacity animates
  halo: { borderRadius: radius.md, boxShadow: shadows.focusHalo },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22,
    color: palette.ink,
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    // Web: the focus is shown by the halo, not the browser outline
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  inputMultiline: { textAlignVertical: 'top' },
  below: { marginTop: space[1] },
});
