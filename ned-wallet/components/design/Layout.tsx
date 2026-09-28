import React, { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, glass, gradients, radius, sizes, space } from '@/constants/design';
import { DText } from './Text';

/** Nền tối gradient 170deg + quầng tím (Ambient orb), nội dung tối đa 480px cho web desktop */
export function Screen({
  children,
  scroll = true,
  glow = true,
  footer,
  contentStyle,
  edges = ['top', 'bottom', 'left', 'right'],
}: {
  children: ReactNode;
  scroll?: boolean;
  glow?: boolean;
  /** Vùng cố định dưới màn (CTA) */
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  return (
    <LinearGradient
      colors={gradients.screen}
      locations={gradients.screenLocations}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={styles.root}
    >
      {glow ? <AmbientGlow /> : null}
      <SafeAreaView style={styles.safe} edges={edges}>
        {scroll ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.content, contentStyle]}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </SafeAreaView>
    </LinearGradient>
  );
}

/** radial-gradient(circle, rgba(123,47,190,0.36) 0%, rgba(99,102,241,0.1) 45%, transparent 68%) */
export function AmbientGlow({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[styles.glow, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 400 380">
        <Defs>
          <RadialGradient id="nedGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.brand} stopOpacity={0.36} />
            <Stop offset="0.45" stopColor={colors.info} stopOpacity={0.1} />
            <Stop offset="0.68" stopColor={colors.info} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="400" height="380" fill="url(#nedGlow)" />
      </Svg>
    </View>
  );
}

/** Nút vuông 44 bo 12 trên lớp kính (back, QR, đóng…) */
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, style]}
    >
      <Feather name={icon} size={20} color={color} />
    </Pressable>
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
  root: { flex: 1, overflow: 'hidden' },
  safe: { flex: 1, width: '100%', maxWidth: sizes.maxContent, alignSelf: 'center' },
  content: { flexGrow: 1, paddingHorizontal: space[5], paddingTop: space[2], paddingBottom: space[8] },
  footer: { paddingHorizontal: space[5], paddingTop: space[3], paddingBottom: space[3] },
  glow: { position: 'absolute', top: 40, alignSelf: 'center', width: 400, height: 380 },
  iconButton: {
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: radius.md,
    backgroundColor: glass.fill,
    borderWidth: 1,
    borderColor: glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: sizes.touch, marginBottom: space[4] },
  side: { width: sizes.touch },
  right: { alignItems: 'flex-end' },
  title: { flex: 1 },
  section: { paddingTop: space[5], paddingBottom: space[2], paddingHorizontal: space[1] },
});
