import React, { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, glass, radius, space } from '@/constants/design';
import { DText, type Tone } from './Text';

/** Nhóm hàng dạng thẻ kính, có đường chia giữa các hàng (Settings, review…) */
export function ListGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, style]}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 ? <View style={styles.divider} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

type IconName = React.ComponentProps<typeof Feather>['name'];

/** Hàng: ô icon 34 · tiêu đề + mô tả · giá trị / phần phải · mũi tên nếu bấm được */
export function ListRow({
  icon,
  iconTone = 'accent',
  title,
  subtitle,
  value,
  right,
  onPress,
  chevron = !!onPress,
  titleTone,
  accessibilityLabel,
}: {
  icon?: IconName;
  iconTone?: 'accent' | 'success' | 'error';
  title: string;
  subtitle?: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  titleTone?: Tone;
  accessibilityLabel?: string;
}) {
  const tint = iconTones[iconTone];
  const body = (
    <>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: tint.bg }]}>
          <Feather name={icon} size={17} color={tint.fg} />
        </View>
      ) : null}
      <View style={styles.text}>
        <DText variant="bodyLarge" tone={titleTone} style={styles.title} numberOfLines={1}>
          {title}
        </DText>
        {subtitle ? <DText variant="caption" tone="secondary">{subtitle}</DText> : null}
      </View>
      {value ? (
        <DText variant="body" numberOfLines={1} style={styles.value}>
          {value}
        </DText>
      ) : null}
      {right}
      {chevron ? <Feather name="chevron-right" size={18} color={colors.textTertiary} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

/** Hàng nhãn / giá trị cho bảng chi tiết (review, biên nhận) */
export function InfoRow({
  label,
  value,
  valueTone,
  mono,
  last,
}: {
  label: string;
  value: string;
  valueTone?: Tone;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.info, !last && styles.infoBorder]}>
      <DText variant="body" style={styles.infoLabel}>
        {label}
      </DText>
      <DText
        variant={mono ? 'mono' : 'body'}
        tone={valueTone ?? 'primary'}
        style={[styles.infoValue, !mono && styles.infoValueText]}
      >
        {value}
      </DText>
    </View>
  );
}

const iconTones = {
  accent: { bg: glass.iconTint, fg: colors.purple[300] },
  success: { bg: glass.successFill, fg: colors.successText },
  error: { bg: glass.errorFill, fg: colors.errorText },
} as const;

const styles = StyleSheet.create({
  group: {
    borderRadius: radius.xl,
    backgroundColor: glass.fill,
    borderWidth: 1,
    borderColor: glass.border,
    overflow: 'hidden',
  },
  divider: { height: 1, marginLeft: 60, backgroundColor: glass.divider },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 58,
    paddingVertical: space[2],
    paddingHorizontal: space[4],
  },
  pressed: { backgroundColor: colors.surface3 },
  icon: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21 },
  value: { maxWidth: '45%' },
  info: { flexDirection: 'row', justifyContent: 'space-between', gap: space[3], paddingVertical: space[3] },
  infoBorder: { borderBottomWidth: 1, borderColor: glass.divider },
  infoLabel: { flexShrink: 1 },
  infoValue: { textAlign: 'right', maxWidth: '62%' },
  infoValueText: { fontFamily: fonts.bodyMedium },
});
