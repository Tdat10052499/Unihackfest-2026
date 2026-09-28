import React, { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, glass, gradients, orbs, radius, sizes, space, type Orb, type OrbPreset } from '@/constants/design';
import { DText } from './Text';

/** Nền tối gradient 170deg + quầng tím (Ambient orb), nội dung tối đa 480px cho web desktop */
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
  /** Preset quầng sáng của board, `false` để tắt */
  glow?: OrbPreset | false;
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
      {glow ? <AmbientGlow preset={glow} /> : null}
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

/** Quầng sáng nền (ambient orbs) theo preset của từng board — xem `orbs` trong constants/design.ts */
export function AmbientGlow({ preset = 'brand', style }: { preset?: OrbPreset; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {(orbs[preset] as readonly Orb[]).map((o, i) => {
        const id = `orb-${preset}-${i}`;
        return (
          <View
            key={id}
            style={{ position: 'absolute', top: o.y, left: '50%', marginLeft: o.x - o.w / 2, width: o.w, height: o.h }}
          >
            <Svg width="100%" height="100%" viewBox={`0 0 ${o.w} ${o.h}`}>
              <Defs>
                <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
                  {[
                    <Stop key="c" offset="0" stopColor={`rgb(${o.color})`} stopOpacity={o.alpha} />,
                    ...(o.mid ? [<Stop key="m" offset={o.mid[2]} stopColor={`rgb(${o.mid[0]})`} stopOpacity={o.mid[1]} />] : []),
                    <Stop key="e" offset={o.stop} stopColor={`rgb(${o.mid?.[0] ?? o.color})`} stopOpacity={0} />,
                  ]}
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width={o.w} height={o.h} fill={`url(#${id})`} />
            </Svg>
          </View>
        );
      })}
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
