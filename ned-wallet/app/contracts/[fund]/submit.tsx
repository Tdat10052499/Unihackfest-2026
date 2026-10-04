// Submit a milestone (MilestoneSubmit / MilestoneSubmitted boards + build-plan B1): delivery links (with the
// fixed-version hint), a note, a self-check of the brief's "Done when" points (local only, never saved), the live
// delivery fingerprint, the deadline from chain time, itemised fees, slide to submit, then the result.
// The delivery is saved encrypted with the contract; only its fingerprint is public.
import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { short } from '@/components/contracts/format';
import { Card, FeesCard, TopBar } from '@/components/contracts/ui';
import { Badge, Button, Field } from '@/components/design';
import { SlideConfirm } from '@/components/wallet/SlideConfirm';
import { elevation, fonts, palette, radius, space, status } from '@/constants/design';
import { riseStyle, useMotion } from '@/constants/motion';
import { useChainTime } from '@/hooks/useChainTime';
import { useContractContent } from '@/hooks/useContractContent';
import { useFund } from '@/hooks/useFund';
import { useMilestoneActions } from '@/hooks/useMilestoneActions';
import { deliveryEvidence, LIMITS, validateDelivery, type DeliveryDraft } from '@/services/milestone/content';
import { shortHash } from '@/services/milestone/evidence';
import { looksUnversioned } from '@/services/milestone/links';
import { formatCountdown, formatDeadline } from '@/services/milestone/format';

export default function SubmitScreen() {
  const { fund: address = '', i = '0' } = useLocalSearchParams<{ fund: string; i?: string }>();
  const index = Number(i) || 0;
  const insets = useSafeAreaInsets();
  const { fund } = useFund(address);
  const content = useContractContent(address);
  const actions = useMilestoneActions(address || undefined);
  const now = useChainTime();
  const { reduce } = useMotion();
  const [links, setLinks] = useState<string[]>(['']);
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState<{ signature: string; evidence: string } | null>(null);

  const delivery: DeliveryDraft = useMemo(() => ({ links: links.filter((l) => l.trim()), files: [], note }), [links, note]);
  const problems = validateDelivery(delivery);
  const fingerprint = problems.length ? '' : shortHash(deliveryEvidence(delivery));

  if (!fund) {
    return (
      <View style={[u.page, { paddingTop: insets.top + space[4] }]}>
        <View style={u.pad}>
          <TopBar title="Submit" />
        </View>
      </View>
    );
  }
  const ms = fund.milestones[index];
  const other = fund.counterparty.username ? `@${fund.counterparty.username}` : short(fund.counterparty.wallet);
  const criteria = content.brief?.milestones[index]?.criteria ?? [];
  const name = content.brief?.milestones[index]?.name;
  const canSubmit = Boolean(ms?.actions.includes('submit'));

  const submit = async () => {
    try {
      setDone(await actions.submit(index, delivery));
    } catch {
      // the sentence is in actions.error (the key is never in it)
    }
  };

  if (done && ms) {
    return (
      <View style={[u.page]}>
        <ScrollView contentContainerStyle={[u.pad, { paddingTop: insets.top + space[6], paddingBottom: space[6] }]}>
          <Badge label="Devnet · test money" tone="warning" />
          <Animated.View style={[u.gap, riseStyle(0, reduce)]}>
            <View style={u.mark}>
              <Feather name="arrow-up" size={28} color={status.warning.ink} />
            </View>
            <Text style={u.h1} accessibilityRole="header">
              Submitted · in review
            </Text>
            <Text style={u.body}>
              Released automatically when the review time ends, or earlier when {other} approves. {other} reads your delivery in the contract.
            </Text>
            <Card>
              <View style={u.row}>
                <Text style={u.k}>Fingerprint</Text>
                <Text style={u.mono}>{done.evidence}</Text>
              </View>
              <View style={[u.row, u.divider]}>
                <Text style={u.k}>Review by</Text>
                <Text style={u.v}>{formatDeadline(ms.reviewBy)}</Text>
              </View>
              <Text style={u.link} accessibilityRole="link" onPress={() => void Linking.openURL(`https://explorer.solana.com/tx/${done.signature}?cluster=devnet`)}>
                View on Explorer ↗
              </Text>
            </Card>
          </Animated.View>
        </ScrollView>
        <View style={[u.bar, { paddingBottom: Math.max(insets.bottom, space[4]) + space[2] }]}>
          <Button title="View contract" onPress={() => router.replace(`/contracts/${fund.address}` as Href)} />
          <Button title="Back to Home" variant="secondary" onPress={() => router.replace('/home')} />
        </View>
      </View>
    );
  }

  return (
    <View style={u.page}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[u.pad, { paddingTop: insets.top + space[2], paddingBottom: space[6] }]}>
        <TopBar title={`Submit milestone ${index + 1}`} back={`/contracts/${fund.address}`} />
        <Animated.View style={[u.gap, riseStyle(0, reduce)]}>
          <Card>
            <View style={u.row}>
              <View style={u.flex}>
                <Text style={u.cardTitle}>
                  {fund.title} · Milestone {index + 1}
                  {name ? ` · ${name}` : ''}
                </Text>
                <Text style={u.small}>for {other}</Text>
              </View>
              <Text style={u.mono}>{ms?.amountLabel.replace(' (estimate)', '')}</Text>
            </View>
          </Card>
          {ms ? (
            <View accessibilityRole="timer" style={[u.timer, elevation.s1]}>
              <Feather name="clock" size={15} color={palette.ink2} />
              <Text style={u.timerText}>
                Submit by {formatDeadline(ms.submitBy)} · {ms.submitBy >= now ? `${formatCountdown(ms.submitBy - now)} left` : 'deadline passed'}
              </Text>
            </View>
          ) : null}
        </Animated.View>

        {!content.hasKey && content.contentStatus !== 'loading' ? (
          <View style={[u.notice, { backgroundColor: status.warning.bg }]}>
            <Text style={[u.body, { color: status.warning.ink }]}>
              This device cannot open the contract yet. Open N.E.D on a device you used for this contract before, or paste the contract link on the contract page.
            </Text>
          </View>
        ) : null}

        <Text style={u.h2} accessibilityRole="header">
          Delivery links
        </Text>
        {links.map((l, k) => (
          <Field
            key={k}
            on="ground"
            value={l}
            onChangeText={(t) => setLinks((list) => list.map((x, j) => (j === k ? t : x)))}
            placeholder="https://…"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={`Delivery link ${k + 1}`}
            hint={looksUnversioned(l) ? 'Use a fixed version: a Figma link with version-id, or a Git commit / tree/<sha> / blob/<sha>.' : undefined}
          />
        ))}
        {links.length < LIMITS.links ? (
          <Text style={u.add} accessibilityRole="button" onPress={() => setLinks((list) => [...list, ''])}>
            + Add a link
          </Text>
        ) : null}
        <Field label={`Note · ${[...note].length}/${LIMITS.noteChars}`} on="ground" value={note} onChangeText={setNote} multiline placeholder="What changed, what to look at first" />

        {criteria.length ? (
          <Card style={u.gap}>
            <Text style={u.cardTitle}>Check before you submit</Text>
            <Text style={u.small}>Only for you: these ticks are not saved or sent.</Text>
            {criteria.map((c, k) => (
              <Pressable key={c} accessibilityRole="checkbox" accessibilityState={{ checked: !!checked[k] }} onPress={() => setChecked((x) => ({ ...x, [k]: !x[k] }))} style={u.check}>
                <View style={[u.box, checked[k] && u.boxOn]}>{checked[k] ? <Feather name="check" size={14} color={palette.onAccent} /> : null}</View>
                <Text style={u.checkText}>{c}</Text>
              </Pressable>
            ))}
          </Card>
        ) : null}

        <Card style={u.fp}>
          <Feather name="hash" size={16} color={palette.link} />
          <View style={u.flex}>
            <Text style={u.small}>Fingerprint saved on-chain</Text>
            <Text style={u.mono}>{fingerprint || '—'}</Text>
          </View>
        </Card>
        <Text style={u.small}>The links and the note are saved encrypted with the contract; {other} reads them in the app or the Workspace.</Text>
        <FeesCard partner={fund.destination?.kind === 'payoutPartner'} />
      </ScrollView>
      <View style={[u.bar, { paddingBottom: Math.max(insets.bottom, space[4]) + space[2] }]}>
        {problems.length && (links.some((l) => l.trim()) || note) ? <Text style={u.error}>{problems[0].message}</Text> : null}
        {!canSubmit ? <Text style={u.error}>This milestone cannot be submitted now.</Text> : null}
        {actions.error ? (
          <Text style={u.error} accessibilityRole="alert">
            {actions.error}
          </Text>
        ) : null}
        <SlideConfirm
          title="Slide to submit"
          disabled={!canSubmit || problems.length > 0 || !content.hasKey}
          busy={actions.busy}
          busyLabel={actions.status || undefined}
          onConfirm={() => void submit()}
        />
      </View>
    </View>
  );
}

const u = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.ground },
  pad: { paddingHorizontal: space[4], gap: 10, width: '100%', maxWidth: 480, alignSelf: 'center' },
  gap: { gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: space[2] },
  divider: { borderTopWidth: 1, borderTopColor: palette.divider },
  h1: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: palette.ink },
  h2: { marginTop: space[2], fontFamily: fonts.display, fontSize: 17, color: palette.ink },
  cardTitle: { fontFamily: fonts.display, fontSize: 15, color: palette.ink },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.ink2 },
  small: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: palette.caption },
  k: { fontFamily: fonts.body, fontSize: 13, color: palette.caption },
  v: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.ink },
  mono: { fontFamily: fonts.monoBold, fontSize: 14, color: palette.ink },
  link: { marginTop: space[2], fontFamily: fonts.bodySemi, fontSize: 13, color: palette.link },
  timer: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[3], paddingHorizontal: 14, borderRadius: 14, backgroundColor: palette.card },
  timerText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 13, color: palette.ink },
  notice: { padding: space[3], borderRadius: 14 },
  add: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.link, paddingVertical: space[1] },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: space[1] },
  // Checkbox control: the ring is allowed for checkbox, radio and switch controls
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: palette.muted, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: palette.accent, borderColor: palette.accent },
  checkText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.ink },
  fp: { flexDirection: 'row', alignItems: 'center', gap: space[3], backgroundColor: palette.tint },
  error: { fontFamily: fonts.body, fontSize: 13, color: status.error.ink, textAlign: 'center' },
  mark: { width: 64, height: 64, borderRadius: radius.pill, backgroundColor: status.warning.bg, alignItems: 'center', justifyContent: 'center' },
  bar: { paddingTop: 10, paddingHorizontal: space[4], gap: space[2], backgroundColor: palette.ground },
});
