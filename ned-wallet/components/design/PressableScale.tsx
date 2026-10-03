// Press feedback of the Motion & surfaces board: scale to 0.98 over 160 ms (Reanimated 4 CSS transition, transform
// only). Reduce Motion → instant. Used by Button, pressable rows, cards and icon buttons.
import React, { useState, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { cssEasing, duration, useMotion } from '@/constants/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PRESSED_SCALE = 0.98;

export function PressableScale({
  style,
  pressedStyle,
  children,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & {
  /** Layout and look of the pressable box */
  style?: StyleProp<ViewStyle>;
  /** Extra tone while pressed (e.g. a darker fill); transform is handled here */
  pressedStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  const { ms } = useMotion();
  const active = pressed && !disabled;
  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      style={[
        style,
        active && pressedStyle,
        {
          transform: [{ scale: active ? PRESSED_SCALE : 1 }],
          transitionProperty: 'transform',
          transitionDuration: ms(duration.press),
          transitionTimingFunction: cssEasing.standard,
        },
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}
