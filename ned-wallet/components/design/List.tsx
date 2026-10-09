import React, { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, elevation, fonts, palette, radius, space, status } from '@/constants/design';
import { PressableScale } from './PressableScale';
import { DText, type Tone } from './Text';

/** Grouped rows on a white card with S1; a #F0F0F3 divider only between rows (Settings, review…) */
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

/** Row: 34 icon tile · title + description · value / right part · chevron when pressable */
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
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={styles.row}
      pressedStyle={styles.pressed}
    >
      {body}
    </PressableScale>
  );
}

/** Label / value row for detail tables (review, receipt) */
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
    <>
    <View style={styles.info}>
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
    {last ? null : <View style={styles.infoDivider} />}
    </>
  );
}

const iconTones = {
  accent: { bg: status.accent.bg, fg: status.accent.ink },
  success: { bg: status.success.bg, fg: status.success.ink },
  error: { bg: status.error.bg, fg: status.error.ink },
} as const;

const styles = StyleSheet.create({
  group: { borderRadius: radius.xl, backgroundColor: palette.card, ...elevation.s1 },
  divider: { height: 1, marginLeft: 60, backgroundColor: palette.divider },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 58,
    paddingVertical: space[2],
    paddingHorizontal: space[4],
  },
  pressed: { backgroundColor: palette.row, borderRadius: radius.xl },
  icon: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21 },
  value: { maxWidth: '45%' },
  info: { flexDirection: 'row', justifyContent: 'space-between', gap: space[3], paddingVertical: space[3] },
  infoDivider: { height: 1, backgroundColor: palette.divider },
  infoLabel: { flexShrink: 1 },
  infoValue: { textAlign: 'right', maxWidth: '62%' },
  infoValueText: { fontFamily: fonts.bodyMedium },
});
