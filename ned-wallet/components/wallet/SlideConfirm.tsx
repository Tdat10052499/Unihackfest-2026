import React, { useMemo, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius, space, type } from '@/constants/design';

/** Drag confirmation with an explicit button alternative for keyboard/assistive input. */
export function SlideConfirm({
  title,
  disabled,
  onConfirm,
}: {
  title: string;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const [width, setWidth] = useState(0);
  const [offset] = useState(() => new Animated.Value(0));
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !disabled && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) =>
          offset.setValue(Math.max(0, Math.min(width - 62, gesture.dx))),
        onPanResponderRelease: (_, gesture) => {
          const limit = width - 62;
          offset.setValue(0);
          if (!disabled && limit > 0 && gesture.dx >= limit * 0.85) onConfirm();
        },
        onPanResponderTerminate: () => offset.setValue(0),
      }),
    [disabled, width, offset, onConfirm],
  );
  return (
    <View style={disabled && styles.disabled}>
      <View
        style={styles.track}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        <LinearGradient
          colors={gradients.purpleIndigo}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <Text style={styles.label}>{title}</Text>
        <Animated.View
          {...pan.panHandlers}
          style={[styles.thumb, { transform: [{ translateX: offset }] }]}
        >
          <Feather name="arrow-right" size={22} color={colors.brand} />
        </Animated.View>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onConfirm}
        style={styles.alternative}
      >
        <Text style={styles.alternativeText}>Tap to confirm instead</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  track: {
    marginTop: space[4],
    height: 60,
    borderRadius: radius.pill,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    left: 5,
    top: 5,
    width: 50,
    height: 50,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
    paddingLeft: 40,
    ...type.button,
    fontSize: 15,
  },
  alternative: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginTop: space[1],
  },
  alternativeText: {
    ...type.caption,
    color: colors.textSecondary,
  },
  disabled: { opacity: 0.4 },
});
