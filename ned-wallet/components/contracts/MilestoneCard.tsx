// Milestone card of the ContractDetail board: number (+ name from the brief), amount, status chip, submit-by /
// review-by, chain-time countdown (warning tint in the last 10 % or when it has passed), "Done when", partner note.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts, palette, radius, space, status } from '@/constants/design';
import { formatDeadline } from '@/services/milestone/format';
import { RELEASED_TO_PARTNER, type MilestoneView } from '@/services/milestone/view';
import { Chip, Tag } from './ui';

export function MilestoneCard({ ms, name, criteria, vn, usdSub, now }: { ms: MilestoneView; name?: string; criteria?: string[]; vn: boolean; usdSub?: string; /** chain time */ now: number }) {
  const cd = ms.countdown;
  // The countdown runs to the submit deadline (pending) or to the end of the review time (submitted)
  const window = Math.max(1, ms.status === 'submitted' ? ms.reviewBy - ms.submitBy : 3600);
  const warn = cd ? cd.to - now < window * 0.1 : false;
  const released = ms.statusLabel === RELEASED_TO_PARTNER;
  return (
    <View accessibilityRole="summary" accessibilityLabel={`Milestone ${ms.index + 1}, ${ms.statusLabel}`} style={m.card}>
      <View style={m.top}>
        <Text style={m.name} numberOfLines={2}>
          Milestone {ms.index + 1}
          {name ? ` · ${name}` : ''}
        </Text>
        <View style={m.amount}>
          <Text style={m.amountValue}>{ms.amountLabel.replace(' (estimate)', '')}</Text>
          {vn && usdSub ? <Text style={m.amountSub}>{usdSub}</Text> : null}
        </View>
      </View>
      <View style={{ marginTop: space[2] }}>
        <Chip tone={ms.tone}>{released ? 'Released' : ms.statusLabel}</Chip>
      </View>
      <View style={m.dates}>
        <View style={m.date}>
          <Text style={m.dateLabel}>Submit by</Text>
          <Text style={m.dateValue}>{formatDeadline(ms.submitBy)}</Text>
        </View>
        <View style={m.date}>
          <Text style={m.dateLabel}>Review by</Text>
          <Text style={m.dateValue}>{formatDeadline(ms.reviewBy)}</Text>
        </View>
      </View>
      {cd ? (
        <View accessibilityRole="timer" style={[m.timer, warn && { backgroundColor: status.warning.bg }]}>
          <Feather name="clock" size={13} color={warn ? status.warning.ink : palette.ink2} />
          <Text style={[m.timerText, warn && { color: status.warning.ink }]}>{cd.label.charAt(0).toUpperCase() + cd.label.slice(1)}</Text>
        </View>
      ) : null}
      {criteria?.length ? (
        <View style={m.criteria} accessibilityLabel="Done when">
          <Text style={m.criteriaTitle}>Done when</Text>
          {criteria.map((c) => (
            <View key={c} style={m.criterion}>
              <Feather name="check" size={14} color={status.success.ink} style={{ marginTop: 2 }} />
              <Text style={m.criterionText}>{c}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {released ? (
        <View style={m.note}>
          <Text style={m.noteText}>Released to payout partner · VND payout simulated in this demo</Text>
          <Tag>SIMULATED</Tag>
        </View>
      ) : null}
    </View>
  );
}

const m = StyleSheet.create({
  card: { padding: 14, borderRadius: radius.xl, backgroundColor: palette.card },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space[3] },
  name: { flex: 1, fontFamily: fonts.display, fontSize: 15, color: palette.ink },
  amount: { alignItems: 'flex-end' },
  amountValue: { fontFamily: fonts.monoBold, fontSize: 15, color: palette.ink },
  amountSub: { fontFamily: fonts.body, fontSize: 11, color: palette.caption },
  dates: { flexDirection: 'row', gap: space[2], marginTop: space[3] },
  date: { flex: 1 },
  dateLabel: { fontFamily: fonts.body, fontSize: 11, color: palette.caption },
  dateValue: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.ink },
  timer: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: space[2], paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#E6E6EB' },
  timerText: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.ink2 },
  criteria: { marginTop: space[3], gap: 6 },
  criteriaTitle: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.caption },
  criterion: { flexDirection: 'row', gap: space[2] },
  criterionText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: palette.ink2 },
  note: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  noteText: { fontFamily: fonts.body, fontSize: 12, color: palette.ink2 },
});
