import React, { Children, isValidElement, type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, palette, radius, sizes, space, type OrbPreset } from '@/constants/design';
import { riseStyle, useMotion } from '@/constants/motion';
import { PressableScale } from './PressableScale';
import { DText } from './Text';

/** True on phones narrower than sizes.narrow: screens move the Devnet badge to its own line there */
export function useNarrow(): boolean {
  return useWindowDimensions().width < sizes.narrow;
}

/**
 * Screen frame: flat ground (#F4F4F6), content max 480 px on web. The top-level children enter with a fade and a
 * 10 px rise, 40 ms apart for the first five (constants/motion riseStyle; no animation with Reduce Motion).
 */
export function Screen({
  children,
  scroll = true,
  glow = false,
  footer,
  contentStyle,
  edges = ['top', 'bottom', 'left', 'right'],
}: {
  children: ReactNode;
  scroll?: boolean;
  /** @deprecated ambient glows belong to the dark theme; ignored in v2 */
  glow?: OrbPreset | false;
  /** Vùng cố định dưới màn (CTA) */
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  void glow;
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={edges}>
        {scroll ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.content, contentStyle]}
          >
            <Staggered>{children}</Staggered>
          </ScrollView>
        ) : (
          <Rise index={0} style={[styles.content, styles.fill, contentStyle]}>
            {children}
          </Rise>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </SafeAreaView>
    </View>
  );
}

/**
 * Wraps each top-level child so it can enter on its own. A child that flexes (a spacer pushing content down) gives
 * its wrapper the same grow, never shrink: `flex: n` on web would also shrink the content to the viewport.
 */
function Rise({ index, style, children }: { index: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const { reduce } = useMotion();
  return <Animated.View style={[style, riseStyle(index, reduce)]}>{children}</Animated.View>;
}

function Staggered({ children }: { children: ReactNode }) {
  return (
    <>
      {Children.toArray(children).map((child, i) => {
        const flex = isValidElement<{ style?: StyleProp<ViewStyle> }>(child) ? StyleSheet.flatten(child.props.style)?.flex : undefined;
        return (
          <Rise key={isValidElement(child) && child.key != null ? child.key : i} index={i} style={flex ? { flexGrow: flex, flexShrink: 0 } : undefined}>
            {child}
          </Rise>
        );
      })}
    </>
  );
}

/** @deprecated ambient glows belong to the dark theme; renders nothing in v2 (kept so screens compile) */
export function AmbientGlow(_props: { preset?: OrbPreset; style?: StyleProp<ViewStyle> }) {
  return null;
}

/** Square 44 × 44 icon button, radius 12, tonal fill (back, QR, close…); scales on press */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  color = colors.textSecondary,
  style,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.iconButton, style]}
      pressedStyle={styles.pressed}
    >
      <Feather name={icon} size={20} color={color} />
    </PressableScale>
  );
}

/** Hàng đầu màn: back · tiêu đề giữa (H3) · phần phải */
export function Header({ title, onBack, right }: { title?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.side}>
        {onBack ? <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={onBack} /> : null}
      </View>
      {title ? (
        <DText variant="h3" align="center" numberOfLines={1} style={styles.title} accessibilityRole="header">
          {title}
        </DText>
      ) : (
        <View style={styles.title} />
      )}
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

/** Nhãn nhóm in hoa (Label: Inter Medium 12 / uppercase) */
export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.section, style]}>
      <DText variant="label" accessibilityRole="header">
        {children}
      </DText>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  root: { flex: 1, overflow: 'hidden', backgroundColor: palette.ground },
  safe: { flex: 1, width: '100%', maxWidth: sizes.maxContent, alignSelf: 'center' },
  content: { flexGrow: 1, paddingHorizontal: space[5], paddingTop: space[2], paddingBottom: space[8] },
  footer: { paddingHorizontal: space[5], paddingTop: space[3], paddingBottom: space[3] },
  iconButton: {
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: radius.md,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: palette.hoverGround },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: sizes.touch, marginBottom: space[4] },
  side: { width: sizes.touch },
  right: { alignItems: 'flex-end' },
  title: { flex: 1 },
  section: { paddingTop: space[5], paddingBottom: space[2], paddingHorizontal: space[1] },
});
