// Shared pieces of the contract screens (ContractDetail / ContractAccept / ContractLock / ContractClose boards).
import React, { type ReactNode } from 'react';
import { useRegion } from '../../hooks/useRegion';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { router, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Badge, IconButton } from '@/components/design';
import { elevation, fonts, palette, radius, space, status } from '@/constants/design';
import type { ChipTone } from '@/services/milestone/view';

export const TONE: Record<ChipTone, { bg: string; ink: string; dot: string }> = {
  info: status.info,
  accent: status.accent,
  warning: status.warning,
  success: status.success,
  neutral: status.neutral,
};

/** Back (white, S1) · title · Devnet badge */
export function TopBar({ title, back = '/contracts', badge = true }: { title: string; back?: string; badge?: boolean }) {
  return (
    <View style={s.top}>
      <IconButton
        icon="chevron-left"
        accessibilityLabel="Back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace(back as Href))}
        style={elevation.s1}
      />
      <Text style={s.topTitle} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {badge ? <Badge label="Devnet · test money" tone="warning" /> : null}
    </View>
  );
}

export function Chip({ tone, children }: { tone: ChipTone; children: string }) {
  const t = TONE[tone];
  return (
    <View style={[s.chip, { backgroundColor: t.bg }]}>
      <View style={[s.chipDot, { backgroundColor: t.dot }]} />
      <Text style={[s.chipText, { color: t.ink }]}>{children}</Text>
    </View>
  );
}

export function Tag({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'info' }) {
  return (
    <View style={[s.tag, tone === 'info' && { backgroundColor: status.info.bg }]}>
      <Text style={[s.tagText, tone === 'info' && { color: status.info.ink }]}>{children}</Text>
    </View>
  );
}

export function Card({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: boolean }) {
  return <View style={[s.card, accent && elevation.sAccent, style]}>{children}</View>;
}

/**
 * Itemised fees: N.E.D none, network ~0.000005 SOL, partner fee (VND path only) — never "free". A4: the Vietnam view
 * (or no region yet) shows no SOL amount: "Test SOL on devnet · it has no value".
 */
export function FeesCard({ partner, extra }: { partner?: boolean; extra?: { label: string; value: string; sub?: string } }) {
  const { region } = useRegion();
  const vn = region !== 'intl';
  const rows: { label: string; value: string; sub?: string; simulated?: boolean }[] = [
    { label: 'N.E.D fee', value: 'None during the pilot' },
    vn ? { label: 'Network fee', value: 'Test SOL on devnet', sub: 'it has no value' } : { label: 'Network fee', value: '~0.000005 SOL', sub: 'devnet test SOL' },
    ...(extra ? [extra] : []),
    ...(partner ? [{ label: 'Payout partner fee', value: 'Set by the partner', simulated: true }] : []),
  ];
  return (
    <View style={s.card} accessibilityRole="summary" accessibilityLabel="Fees">
      <Text style={s.feesTitle}>Fees</Text>
      {rows.map((r) => (
        <View key={r.label} style={[s.feeRow, s.divider]}>
          <Text style={s.feeLabel}>{r.label}</Text>
          <View style={s.feeRight}>
            <View style={s.feeValueRow}>
              <Text style={s.feeValue}>{r.value}</Text>
              {r.simulated ? <Tag>SIMULATED</Tag> : null}
            </View>
            {r.sub ? <Text style={s.feeSub}>{r.sub}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

export const RULES = [
  'Released when the client approves, or automatically after the review time.',
  'Refunded to the client if a submission deadline is missed.',
  'Nobody, including N.E.D, can move it any other way.',
];

export function RulesList({ items = RULES }: { items?: string[] }) {
  const icons: React.ComponentProps<typeof Feather>['name'][] = ['check', 'rotate-ccw', 'lock'];
  return (
    <View accessibilityRole="list" accessibilityLabel="Contract rules" style={s.rules}>
      {items.map((t, i) => (
        <View key={t} style={s.rule}>
          <View style={s.ruleIcon}>
            <Feather name={icons[i] ?? 'check'} size={15} color={palette.link} />
          </View>
          <Text style={s.ruleText}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

export const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingTop: space[1] },
  topTitle: { flex: 1, fontFamily: fonts.display, fontSize: 18, color: palette.ink },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 24, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start', maxWidth: '100%' },
  chipDot: { width: 6, height: 6, borderRadius: radius.pill },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16, flexShrink: 1 },
  tag: { height: 20, paddingHorizontal: 7, borderRadius: 6, backgroundColor: palette.hoverGround, justifyContent: 'center' },
  tagText: { fontFamily: fonts.bodySemi, fontWeight: '700', fontSize: 10, color: palette.ink2 },
  card: { padding: 14, borderRadius: radius.xl, backgroundColor: palette.card },
  divider: { borderTopWidth: 1, borderTopColor: palette.divider },
  feesTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink, paddingBottom: space[2] },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space[3], paddingVertical: space[3] },
  feeLabel: { fontFamily: fonts.body, fontSize: 14, color: palette.caption },
  feeRight: { alignItems: 'flex-end', flexShrink: 1 },
  feeValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  feeValue: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink },
  feeSub: { fontFamily: fonts.body, fontSize: 12, color: palette.caption },
  rules: { gap: space[3] },
  rule: { flexDirection: 'row', gap: space[3], alignItems: 'flex-start' },
  ruleIcon: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: palette.tint, alignItems: 'center', justifyContent: 'center' },
  ruleText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.ink2, paddingTop: 5 },
});
