// "Slide to …" of the contract boards (ContractAccept / ContractLock / ContractClose): a tint pill with a purple thumb.
// A drag past 85 % confirms; "Tap to confirm instead" is the keyboard and assistive-technology path. While `busy`,
// the label shows the wallet status and nothing can be confirmed twice.
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts, palette, radius, space } from '@/constants/design';

const THUMB = 50;
const PAD = 4;

export function SlideConfirm({
  title,
  disabled,
  busy,
  busyLabel = 'Confirm in your wallet…',
  onConfirm,
}: {
  title: string;
  disabled?: boolean;
  busy?: boolean;
  busyLabel?: string;
  onConfirm: () => void;
}) {
  const [width, setWidth] = useState(0);
  const [offset] = useState(() => new Animated.Value(0));
  const off = disabled || busy;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !off,
        onMoveShouldSetPanResponder: (_, g) => !off && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) => offset.setValue(Math.max(0, Math.min(width - THUMB - 2 * PAD, g.dx))),
        onPanResponderRelease: (_, g) => {
          const limit = width - THUMB - 2 * PAD;
          offset.setValue(0);
          if (!off && limit > 0 && g.dx >= limit * 0.85) onConfirm();
        },
        onPanResponderTerminate: () => offset.setValue(0),
      }),
    [off, width, offset, onConfirm]
  );
  return (
    <View style={disabled && styles.disabled}>
      <View
        accessibilityLabel={busy ? busyLabel : title}
        style={[styles.track, disabled && styles.trackOff]}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        <Text style={[styles.label, disabled && styles.labelOff]}>{busy ? busyLabel : title}</Text>
        <Animated.View {...pan.panHandlers} style={[styles.thumb, disabled && styles.thumbOff, { transform: [{ translateX: offset }] }]}>
          {busy ? <ActivityIndicator color={palette.onAccent} /> : <Feather name="arrow-right" size={22} color={palette.onAccent} />}
        </Animated.View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={off} onPress={onConfirm} style={styles.alternative}>
        <Text style={styles.alternativeText}>Tap to confirm instead</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 58, padding: PAD, borderRadius: radius.pill, backgroundColor: palette.tint, justifyContent: 'center' },
  trackOff: { backgroundColor: '#E6E6EB' },
  thumb: {
    position: 'absolute',
    left: PAD,
    top: PAD,
    width: THUMB,
    height: THUMB,
    borderRadius: radius.pill,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbOff: { backgroundColor: palette.muted },
  label: { textAlign: 'center', paddingLeft: THUMB, fontFamily: fonts.bodySemi, fontSize: 16, color: palette.link },
  labelOff: { color: palette.muted },
  alternative: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: space[1] },
  alternativeText: { fontFamily: fonts.body, fontSize: 12, color: palette.caption },
  disabled: { opacity: 1 },
});
