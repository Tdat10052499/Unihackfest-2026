// Review a milestone (MilestoneReview / MilestoneReleased boards + build-plan B1): the delivery (links, note, file
// fingerprints) decrypted from the contract, "On time" from submitted_at, "Same delivery that was submitted ✓" or
// "Does not match what was submitted", the auto-release countdown, a local check of the "Done when" points,
// itemised fees, slide to release, then the result. Dispute only with FEATURES.dispute (P1).
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { short } from '@/components/contracts/format';
import { Card, Chip, FeesCard, TopBar } from '@/components/contracts/ui';
import { Badge, Button } from '@/components/design';
import { SlideConfirm } from '@/components/wallet/SlideConfirm';
import { fonts, palette, radius, space, status } from '@/constants/design';
import { FEATURES } from '@/constants/features';
import { riseStyle, useMotion } from '@/constants/motion';
import { useChainTime } from '@/hooks/useChainTime';
import { useContractContent } from '@/hooks/useContractContent';
import { useFund } from '@/hooks/useFund';
import { useMilestoneActions } from '@/hooks/useMilestoneActions';
import { formatCountdown, formatDeadline } from '@/services/milestone/format';

export default function ReviewScreen() {
  const { fund: address = '', i = '0' } = useLocalSearchParams<{ fund: string; i?: string }>();
  const index = Number(i) || 0;
  const insets = useSafeAreaInsets();
  const { fund } = useFund(address);
  const content = useContractContent(address);
  const actions = useMilestoneActions(address || undefined);
  const now = useChainTime();
  const { reduce } = useMotion();
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [released, setReleased] = useState('');

  if (!fund) {
    return (
      <View style={[r.page, { paddingTop: insets.top + space[4] }]}>
        <View style={r.pad}>
          <TopBar title="Review" />
        </View>
      </View>
    );
  }
  const ms = fund.milestones[index];
  const other = fund.counterparty.username ? `@${fund.counterparty.username}` : short(fund.counterparty.wallet);
  const delivery = content.deliveries[index];
  const criteria = content.brief?.milestones[index]?.criteria ?? [];
  const name = content.brief?.milestones[index]?.name;
  const canApprove = Boolean(ms?.actions.includes('approve'));
  const dest = fund.destination?.kind === 'payoutPartner' ? 'VND via payout partner (simulated)' : `${other}’s wallet`;

  const release = async () => {
    try {
      const res = await actions.approve(index);
      setReleased(res.signature);
    } catch {
      // the sentence is in actions.error
    }
  };

  if (released && ms) {
    const amount = ms.amountLabel.replace(' (estimate)', '');
    return (
      <View style={r.page}>
        <ScrollView contentContainerStyle={[r.pad, { paddingTop: insets.top + space[6], paddingBottom: space[6] }]}>
          <Badge label="Devnet · test money" tone="warning" />
          <Animated.View style={[r.gap, riseStyle(0, reduce)]}>
            <View style={r.mark}>
              <Feather name="check" size={30} color={status.success.ink} />
            </View>
            <Chip tone="success">Released</Chip>
            <Text style={r.h1} accessibilityRole="header">
              Released to {other}
            </Text>
            <Text style={r.body}>
              {fund.title} · Milestone {index + 1} · {amount}
            </Text>
            <Card>
              {[
                ['Contract', `${fund.title} · Milestone ${index + 1}`],
                ['Amount', amount],
                ['To', dest],
                ['Released by', 'You'],
              ].map(([k, v], n) => (
                <View key={k} style={[r.row, n > 0 && r.divider]}>
                  <Text style={r.k}>{k}</Text>
                  <Text style={r.v}>{v}</Text>
                </View>
              ))}
              <Text style={r.link} accessibilityRole="link" onPress={() => void Linking.openURL(`https://explorer.solana.com/tx/${released}?cluster=devnet`)}>
                View on Explorer ↗
              </Text>
              <Text style={r.small}>N.E.D fee: none during the pilot · Network fee ~0.000005 SOL (devnet test SOL)</Text>
            </Card>
          </Animated.View>
        </ScrollView>
        <View style={[r.bar, { paddingBottom: Math.max(insets.bottom, space[4]) + space[2] }]}>
          <Button title="Done" onPress={() => router.replace(`/contracts/${fund.address}` as Href)} />
        </View>
      </View>
    );
  }

  return (
    <View style={r.page}>
      <ScrollView contentContainerStyle={[r.pad, { paddingTop: insets.top + space[2], paddingBottom: space[6] }]}>
        <TopBar title={`Review milestone ${index + 1}`} back={`/contracts/${fund.address}`} />
        {ms ? (
          <Animated.View style={[r.gap, riseStyle(0, reduce)]}>
            <Card>
              <View style={r.row}>
                <View style={r.flex}>
                  <Text style={r.cardTitle}>
                    {fund.title} · Milestone {index + 1}
                    {name ? ` · ${name}` : ''}
                  </Text>
                  <Text style={r.small}>
                    by {other}
                    {ms.delivery ? ` · submitted ${formatDeadline(ms.delivery.submittedAt)}` : ''}
                  </Text>
                </View>
                <View style={r.right}>
                  <Text style={r.mono}>{ms.amountLabel.replace(' (estimate)', '')}</Text>
                  <Text style={r.small}>{fund.destination?.kind === 'payoutPartner' ? 'to VND via payout partner' : 'to the freelancer’s wallet'}</Text>
                </View>
              </View>
              {ms.delivery ? (
                <View style={{ marginTop: space[2] }}>
                  <Chip tone={ms.delivery.onTime ? 'success' : 'warning'}>{ms.delivery.onTime ? 'On time' : 'Late'}</Chip>
                </View>
              ) : null}
            </Card>
            {ms.status === 'submitted' ? (
              <View accessibilityRole="timer" style={r.timer}>
                <Text style={r.timerText}>
                  Auto-release in <Text style={r.mono}>{formatCountdown(Math.max(0, ms.reviewBy + 1 - now))}</Text>
                  {FEATURES.dispute ? ' unless you dispute' : ' unless you release it sooner'}
                </Text>
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        <Card style={r.gap}>
          <Text style={r.cardTitle}>Delivery</Text>
          {delivery?.matches && delivery.content ? (
            <>
              <Text style={r.ok}>Same delivery that was submitted ✓</Text>
              {delivery.content.links.map((l) => (
                <Text key={l} style={r.linkItem} accessibilityRole="link" numberOfLines={2} onPress={() => void Linking.openURL(l)}>
                  {l}
                </Text>
              ))}
              {delivery.content.files.map((f) => (
                <Text key={f.sha256} style={r.small}>
                  {f.name} · {f.size.toLocaleString('en-US')} bytes · <Text style={r.monoSmall}>{f.sha256.slice(0, 6)}…{f.sha256.slice(-4)}</Text>
                </Text>
              ))}
              {delivery.content.note ? <Text style={r.body}>“{delivery.content.note}”</Text> : null}
              <Text style={r.small}>
                This proves the delivery shown here is the one whose fingerprint ({ms?.evidence}) was saved on-chain, not that the content behind a link is unchanged. Ask for fixed-version links.
              </Text>
            </>
          ) : !content.hasKey && content.contentStatus !== 'loading' ? (
            <Text style={r.body}>Open the contract link on this device to read the delivery. On-chain fingerprint {ms?.evidence}.</Text>
          ) : content.contentStatus === 'loading' ? (
            <Text style={r.small}>Reading the delivery…</Text>
          ) : (
            <Text style={r.bad}>Does not match what was submitted. Do not rely on this delivery; ask {other} to submit it again in the app.</Text>
          )}
        </Card>

        {criteria.length ? (
          <Card style={r.gap}>
            <Text style={r.cardTitle}>Done when</Text>
            <Text style={r.small}>Your own check: these ticks are not saved or sent.</Text>
            {criteria.map((c, k) => (
              <Pressable key={c} accessibilityRole="checkbox" accessibilityState={{ checked: !!checked[k] }} onPress={() => setChecked((x) => ({ ...x, [k]: !x[k] }))} style={r.check}>
                <View style={[r.box, checked[k] && r.boxOn]}>{checked[k] ? <Feather name="check" size={14} color={palette.onAccent} /> : null}</View>
                <Text style={r.checkText}>{c}</Text>
              </Pressable>
            ))}
          </Card>
        ) : null}
        <FeesCard partner={fund.destination?.kind === 'payoutPartner'} />
      </ScrollView>
      <View style={[r.bar, { paddingBottom: Math.max(insets.bottom, space[4]) + space[2] }]}>
        {!canApprove ? <Text style={r.error}>This milestone cannot be released now.</Text> : null}
        {actions.error ? (
          <Text style={r.error} accessibilityRole="alert">
            {actions.error}
          </Text>
        ) : null}
        <SlideConfirm title="Slide to release" disabled={!canApprove} busy={actions.busy} busyLabel={actions.status || undefined} onConfirm={() => void release()} />
        {FEATURES.dispute && actions.dispute && ms?.actions.includes('dispute') ? (
          <Button title="Dispute" variant="secondary" onPress={() => void actions.dispute!(index).catch(() => undefined)} />
        ) : null}
      </View>
    </View>
  );
}

const r = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.ground },
  pad: { paddingHorizontal: space[4], gap: 10, width: '100%', maxWidth: 480, alignSelf: 'center' },
  gap: { gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  right: { alignItems: 'flex-end' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: space[2] },
  divider: { borderTopWidth: 1, borderTopColor: palette.divider },
  h1: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: palette.ink },
  cardTitle: { fontFamily: fonts.display, fontSize: 15, color: palette.ink },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.ink2 },
  small: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: palette.caption },
  k: { fontFamily: fonts.body, fontSize: 13, color: palette.caption },
  v: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.ink, flexShrink: 1, textAlign: 'right' },
  mono: { fontFamily: fonts.monoBold, fontSize: 14, color: palette.ink },
  monoSmall: { fontFamily: fonts.mono, fontSize: 12, color: palette.ink },
  ok: { fontFamily: fonts.bodySemi, fontSize: 14, color: status.success.ink },
  bad: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 20, color: status.error.ink },
  linkItem: { fontFamily: fonts.body, fontSize: 13, color: palette.link, textDecorationLine: 'underline' },
  link: { marginTop: space[2], fontFamily: fonts.bodySemi, fontSize: 13, color: palette.link },
  timer: { paddingVertical: space[3], paddingHorizontal: 14, borderRadius: 14, backgroundColor: status.warning.bg },
  timerText: { fontFamily: fonts.body, fontSize: 13, color: status.warning.ink },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: space[1] },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: palette.muted, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: palette.accent, borderColor: palette.accent },
  checkText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.ink },
  error: { fontFamily: fonts.body, fontSize: 13, color: status.error.ink, textAlign: 'center' },
  mark: { width: 64, height: 64, borderRadius: radius.pill, backgroundColor: status.success.bg, alignItems: 'center', justifyContent: 'center' },
  bar: { paddingTop: 10, paddingHorizontal: space[4], gap: space[2], backgroundColor: palette.ground },
});
