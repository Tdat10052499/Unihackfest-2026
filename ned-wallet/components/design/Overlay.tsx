// Sheet and Popover of the Motion & surfaces board. Sheet: slides up 360 ms over a backdrop that fades in 220 ms.
// Popover: fades in 200 ms from its anchor corner. Both are instant with Reduce Motion (ReduceMotion.System).
import React, { type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { elevation, palette, radius, sizes, space } from '@/constants/design';
import { backdropIn, backdropOut, popoverIn, popoverOut, sheetIn, sheetOut } from '@/constants/motion';
import { IconButton } from './Layout';
import { DText } from './Text';

/** Bottom sheet in a transparent modal; tap on the backdrop or the close button calls onClose */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  accessibilityLabel,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  accessibilityLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {visible ? (
        <View style={styles.root}>
          <Animated.View entering={backdropIn} exiting={backdropOut} style={[StyleSheet.absoluteFill, styles.backdrop]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
          </Animated.View>
          <Animated.View
            entering={sheetIn}
            exiting={sheetOut}
            accessibilityViewIsModal
            accessibilityLabel={accessibilityLabel ?? title}
            style={[styles.sheet, elevation.pop, { paddingBottom: space[5] + insets.bottom }]}
          >
            <View style={styles.handle} />
            {title ? (
              <View style={styles.head}>
                <DText variant="h3" style={styles.title} accessibilityRole="header">
                  {title}
                </DText>
                <IconButton icon="x" accessibilityLabel="Close" onPress={onClose} style={styles.close} />
              </View>
            ) : null}
            {children}
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

/** Floating panel (wallet panel, menus); the caller positions it (absolute) next to its trigger */
export function Popover({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={popoverIn} exiting={popoverOut} style={[styles.popover, elevation.pop, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: palette.scrim },
  sheet: {
    width: '100%',
    maxWidth: sizes.maxContent,
    alignSelf: 'center',
    backgroundColor: palette.card,
    borderTopLeftRadius: radius.xl + 4,
    borderTopRightRadius: radius.xl + 4,
    paddingHorizontal: space[5],
    paddingTop: space[2],
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: radius.pill, backgroundColor: palette.switchOff, marginBottom: space[3] },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[3] },
  title: { flex: 1 },
  close: { backgroundColor: palette.field },
  popover: { backgroundColor: palette.card, borderRadius: radius.xl, overflow: 'hidden' },
});
