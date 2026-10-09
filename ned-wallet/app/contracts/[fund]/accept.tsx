// Accept contract (ContractAccept board + build-plan B1): the brief comes first and must show "Brief matches ✓";
// then where the earnings go (VND via the payout partner, or USDC to the own wallet — hidden in the Vietnam view),
// "can't be changed later", itemised fees, slide to accept. accept() sends the hash of the brief shown here.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { BriefCard } from '@/components/contracts/BriefCard';
import { short, windowText } from '@/components/contracts/format';
import { Card, FeesCard, Tag, TopBar } from '@/components/contracts/ui';
import { PressableScale } from '@/components/design';
import { SlideConfirm } from '@/components/wallet/SlideConfirm';
import { elevation, fonts, palette, radius, space, status } from '@/constants/design';
import { riseStyle, useMotion } from '@/constants/motion';
import { useContractContent } from '@/hooks/useContractContent';
import { useFund } from '@/hooks/useFund';
import { useMilestoneActions } from '@/hooks/useMilestoneActions';
import { useRegion } from '@/hooks/useRegion';
import { formatDeadline, usdcFromUnits } from '@/services/milestone/format';

type Choice = 'payoutPartner' | 'ownWallet';

export default function AcceptScreen() {
  const { fund: address = '' } = useLocalSearchParams<{ fund: string }>();
  const insets = useSafeAreaInsets();
  const { region } = useRegion();
  const vn = (region ?? 'vn') === 'vn';
  const { fund } = useFund(address);
  const content = useContractContent(address);
  const actions = useMilestoneActions(address || undefined);
  const { reduce } = useMotion();
  const [choice, setChoice] = useState<Choice>('payoutPartner');

  if (!fund) {
    return (
      <View style={[a.page, { paddingTop: insets.top + space[4] }]}>
        <View style={a.pad}>
          <TopBar title="Accept contract" />
        </View>
      </View>
    );
  }
  const other = fund.counterparty.username ? `@${fund.counterparty.username}` : short(fund.counterparty.wallet);
  const total = fund.milestones.reduce((s, m) => s + m.amountUnits, 0n);
  const briefOk = content.contentStatus === 'ok';
  const canAccept = fund.actions.includes('accept');
  const pick = vn ? 'payoutPartner' : choice;

  const accept = async () => {
    try {
      await actions.accept(pick);
      router.replace(`/contracts/${fund.address}` as Href);
    } catch {
      // the sentence is in actions.error
    }
  };

  const option = (id: Choice, title: string, body: string, icon: React.ComponentProps<typeof Feather>['name'], simulated?: boolean) => {
    const on = pick === id;
    return (
      <PressableScale key={id} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setChoice(id)} style={[a.option, on ? a.optionOn : elevation.s1]}>
        <View style={a.optionTop}>
          <View style={a.optionIcon}>
            <Feather name={icon} size={18} color={palette.ink} />
          </View>
          <View style={a.optionTitleRow}>
            <Text style={a.optionTitle}>{title}</Text>
            {simulated ? <Tag>SIMULATED</Tag> : null}
          </View>
          <View style={[a.radio, on && a.radioOn]}>{on ? <View style={a.radioDot} /> : null}</View>
        </View>
        <Text style={a.optionBody}>{body}</Text>
      </PressableScale>
    );
  };

  return (
    <View style={a.page}>
      <ScrollView contentContainerStyle={[a.pad, { paddingTop: insets.top + space[2], paddingBottom: space[6] }]}>
        <TopBar title="Accept contract" back={`/contracts/${fund.address}`} />

        <Animated.View style={riseStyle(0, reduce)}>
          <Card>
            <View style={a.sumRow}>
              <View style={a.flex}>
                <Text style={a.sumTitle}>{fund.title}</Text>
                <Text style={a.muted}>from {other}</Text>
              </View>
              <View style={a.sumRight}>
                <Text style={a.sumTotal}>{fund.totalLabel.replace(' (estimate)', '')}</Text>
                <Text style={a.muted}>{vn ? `$${usdcFromUnits(total)} · estimate` : 'total'}</Text>
              </View>
            </View>
          </Card>
        </Animated.View>
        <Animated.View style={riseStyle(1, reduce)}>
          <Card>
            {fund.milestones.map((m) => (
              <Text key={m.index} style={a.msLine}>
                Milestone {m.index + 1} · submit by {formatDeadline(m.submitBy)} · review {windowText(m.reviewBy - m.submitBy)}
              </Text>
            ))}
          </Card>
        </Animated.View>

        <Animated.View style={riseStyle(2, reduce)}>
          <BriefCard content={content} fingerprint={fund.briefHash} />
        </Animated.View>

        <Text style={a.h2} accessibilityRole="header">
          Where should your earnings go?
        </Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Where earnings go" style={a.options}>
          {option(
            'payoutPartner',
            'VND to my Vietnamese bank account',
            'A payout partner converts outside Vietnam and sends VND to your bank. In this demo the partner is simulated (candidates: Due, Nium). Bank details are collected by the partner, not by N.E.D.',
            'home',
            true
          )}
          {vn ? (
            <View style={a.vnOnly}>
              <Feather name="info" size={15} color={palette.ink2} />
              <Text style={a.vnOnlyText}>
                You live in Vietnam, so earnings arrive in VND only. Receiving USDC in a wallet is for people who live outside Vietnam (change this in Settings).
              </Text>
            </View>
          ) : (
            option('ownWallet', 'USDC to my N.E.D account', 'USDC to your N.E.D account. Only where stablecoins are allowed for you.', 'credit-card')
          )}
        </View>

        <View accessibilityRole="text" style={a.note}>
          <Feather name="alert-triangle" size={15} color={status.warning.ink} />
          <Text style={a.noteText}>
            <Text style={a.noteStrong}>This can’t be changed later. </Text>
            You never type an address: earnings go only to the destination you pick here.
          </Text>
        </View>

        <FeesCard partner={pick === 'payoutPartner'} />
      </ScrollView>

      <View style={[a.bar, { paddingBottom: Math.max(insets.bottom, space[4]) + space[2] }]}>
        {!canAccept ? (
          <Text style={a.alert} accessibilityRole="alert">
            {fund.tooLate
              ? `Not enough time left to accept. The milestone 1 deadline is too close to leave a work window. Ask ${other} to create a new contract.`
              : 'This contract cannot be accepted now.'}
          </Text>
        ) : !briefOk ? (
          <Text style={a.alert}>Read the brief first: accepting needs “Brief matches ✓” above.</Text>
        ) : null}
        {actions.error ? (
          <Text style={a.alert} accessibilityRole="alert">
            {actions.error}
          </Text>
        ) : null}
        <SlideConfirm title="Slide to accept" disabled={!canAccept || !briefOk} busy={actions.busy} busyLabel={actions.status || undefined} onConfirm={() => void accept()} />
      </View>
    </View>
  );
}

const a = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.ground },
  pad: { paddingHorizontal: space[4], gap: 10, width: '100%', maxWidth: 480, alignSelf: 'center' },
  flex: { flex: 1, minWidth: 0 },
  muted: { fontFamily: fonts.body, fontSize: 12, color: palette.caption },
  sumRow: { flexDirection: 'row', gap: 10 },
  sumTitle: { fontFamily: fonts.display, fontSize: 17, color: palette.ink },
  sumRight: { alignItems: 'flex-end' },
  sumTotal: { fontFamily: fonts.monoBold, fontSize: 15, color: palette.ink },
  msLine: { fontFamily: fonts.body, fontSize: 12, lineHeight: 20, color: palette.ink2 },
  h2: { marginTop: space[2], fontFamily: fonts.display, fontSize: 17, color: palette.ink },
  options: { gap: 10 },
  option: { padding: 14, borderRadius: radius.xl, backgroundColor: palette.card },
  optionOn: { backgroundColor: palette.tint },
  optionTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: palette.hoverGround, alignItems: 'center', justifyContent: 'center' },
  optionTitleRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  optionTitle: { fontFamily: fonts.display, fontSize: 15, color: palette.ink },
  // Radio control: the ring is allowed for radio and switch controls
  radio: { width: 22, height: 22, borderRadius: radius.pill, borderWidth: 2, borderColor: palette.muted, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: palette.link },
  radioDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: palette.link },
  optionBody: { marginTop: 10, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: palette.ink2 },
  vnOnly: { flexDirection: 'row', gap: 10, paddingVertical: space[3], paddingHorizontal: 14, borderRadius: 16, backgroundColor: palette.hoverGround },
  vnOnlyText: { flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: palette.ink2 },
  note: { flexDirection: 'row', gap: 10, paddingVertical: space[3], paddingHorizontal: 14, borderRadius: 16, backgroundColor: status.warning.bg },
  noteText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.ink },
  noteStrong: { fontFamily: fonts.bodySemi, color: status.warning.ink },
  bar: { paddingTop: 10, paddingHorizontal: space[4], gap: space[2], backgroundColor: palette.ground },
  alert: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: status.error.ink, textAlign: 'center' },
});
