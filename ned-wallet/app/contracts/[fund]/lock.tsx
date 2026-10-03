// Lock (ContractLock board): total to lock, destination and milestones, the rules, balance check with the faucet
// link, itemised fees, slide to lock. Client only, never in the Vietnam view (D18).
import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { short, windowText } from '@/components/contracts/format';
import { Card, FeesCard, RulesList, Tag, TopBar } from '@/components/contracts/ui';
import { SlideConfirm } from '@/components/wallet/SlideConfirm';
import { fonts, palette, space, status } from '@/constants/design';
import { riseStyle, useMotion } from '@/constants/motion';
import { useFund } from '@/hooks/useFund';
import { useMilestoneActions } from '@/hooks/useMilestoneActions';
import { useRegion } from '@/hooks/useRegion';
import { useAuth } from '@/services/auth';
import { formatDeadline, formatUsdc } from '@/services/milestone/format';
import { getUsdcTokenBalance } from '@/services/solana';

const FAUCET = 'https://faucet.circle.com/';

export default function LockScreen() {
  const { fund: address = '' } = useLocalSearchParams<{ fund: string }>();
  const insets = useSafeAreaInsets();
  const { walletAddress } = useAuth();
  const { region } = useRegion();
  const vn = (region ?? 'vn') === 'vn';
  const { fund } = useFund(address);
  const actions = useMilestoneActions(address || undefined);
  const { reduce } = useMotion();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!walletAddress || vn) return;
    getUsdcTokenBalance(walletAddress, true)
      .then(setBalance)
      .catch(() => setBalance(null));
  }, [walletAddress, vn]);

  if (!fund) {
    return (
      <View style={[l.page, { paddingTop: insets.top + space[4] }]}>
        <View style={l.pad}>
          <TopBar title="Lock" />
        </View>
      </View>
    );
  }
  const other = fund.counterparty.username ? `@${fund.counterparty.username}` : short(fund.counterparty.wallet);
  const totalUnits = fund.milestones.reduce((s, m) => s + m.amountUnits, 0n);
  const balanceUnits = balance === null ? null : BigInt(Math.round(balance * 1_000_000));
  const enough = balanceUnits !== null && balanceUnits >= totalUnits;
  const canLock = fund.actions.includes('lock') && !vn;
  const reviewWindows = [...new Set(fund.milestones.map((m) => windowText(m.reviewBy - m.submitBy)))];

  const lock = async () => {
    try {
      await actions.lock();
      router.replace(`/contracts/${fund.address}/locked` as Href);
    } catch {
      // the sentence is in actions.error
    }
  };

  return (
    <View style={l.page}>
      <ScrollView contentContainerStyle={[l.pad, { paddingTop: insets.top + space[2], paddingBottom: space[6] }]}>
        <TopBar title={`Lock for ${other}`} back={`/contracts/${fund.address}`} />
        <Animated.View style={riseStyle(0, reduce)}>
          <Card accent>
            <Text style={l.label}>Total to lock</Text>
            <Text style={l.total}>{formatUsdc(totalUnits)}</Text>
            <Text style={l.sub}>
              {fund.title} · {fund.milestones.length} milestone{fund.milestones.length === 1 ? '' : 's'}
            </Text>
          </Card>
        </Animated.View>
        <Animated.View style={riseStyle(1, reduce)}>
          <Card style={l.rows}>
            <View style={l.row}>
              <Text style={l.k}>Earnings go to</Text>
              <View style={l.vRow}>
                <Text style={l.v}>{fund.destination?.kind === 'payoutPartner' ? 'VND via payout partner' : fund.destination ? 'The freelancer’s own wallet' : '—'}</Text>
                {fund.destination?.simulated ? <Tag>SIMULATED</Tag> : null}
              </View>
            </View>
            {fund.milestones.map((m) => (
              <View key={m.index} style={[l.row, l.divider]}>
                <Text style={l.k}>
                  Milestone {m.index + 1} · {formatUsdc(m.amountUnits)}
                </Text>
                <Text style={l.v}>by {formatDeadline(m.submitBy)}</Text>
              </View>
            ))}
            <View style={[l.row, l.divider]}>
              <Text style={l.k}>Review time</Text>
              <Text style={l.v}>{reviewWindows.length === 1 ? `${reviewWindows[0]} each` : reviewWindows.join(' / ')}</Text>
            </View>
          </Card>
        </Animated.View>
        <Animated.View style={riseStyle(2, reduce)}>
          <Card style={{ gap: space[3] }}>
            <RulesList />
            <View style={[l.row, l.divider]}>
              <Text style={l.k}>Your balance</Text>
              <Text style={l.mono}>{balance === null ? '—' : `${balance.toFixed(2)} USDC`}</Text>
            </View>
            {enough && balanceUnits !== null ? (
              <View style={l.row}>
                <Text style={l.k}>After locking</Text>
                <Text style={l.mono}>{formatUsdc(balanceUnits - totalUnits)}</Text>
              </View>
            ) : balance !== null ? (
              <View style={{ gap: space[1] }}>
                <Text style={l.alert} accessibilityRole="alert">
                  Not enough USDC. You need {formatUsdc(totalUnits)} plus a little test SOL for the network fee.
                </Text>
                <Text style={l.link} accessibilityRole="link" onPress={() => void Linking.openURL(FAUCET)}>
                  Get test USDC (devnet faucet) ↗
                </Text>
              </View>
            ) : null}
          </Card>
        </Animated.View>
        <FeesCard partner={fund.destination?.kind === 'payoutPartner'} />
      </ScrollView>
      <View style={[l.bar, { paddingBottom: Math.max(insets.bottom, space[4]) + space[2] }]}>
        {!canLock ? <Text style={l.alert}>{vn ? 'Client actions are not available in the Vietnam view.' : 'This contract cannot be locked now.'}</Text> : null}
        {actions.error ? (
          <Text style={l.alert} accessibilityRole="alert">
            {actions.error}
          </Text>
        ) : null}
        <SlideConfirm title="Slide to lock" disabled={!canLock || !enough} busy={actions.busy} busyLabel={actions.status || undefined} onConfirm={() => void lock()} />
      </View>
    </View>
  );
}

const l = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.ground },
  pad: { paddingHorizontal: space[4], gap: 10, width: '100%', maxWidth: 480, alignSelf: 'center' },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.ink2 },
  total: { marginTop: 2, fontFamily: fonts.display, fontSize: 36, lineHeight: 42, color: palette.ink },
  sub: { fontFamily: fonts.body, fontSize: 13, color: palette.ink2 },
  rows: { paddingVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: space[3] },
  divider: { borderTopWidth: 1, borderTopColor: palette.divider },
  k: { fontFamily: fonts.body, fontSize: 13, color: palette.caption, flexShrink: 1 },
  vRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  v: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.ink },
  mono: { fontFamily: fonts.monoBold, fontSize: 13, color: palette.ink },
  alert: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: status.error.ink },
  link: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.link },
  bar: { paddingTop: 10, paddingHorizontal: space[4], gap: space[2], backgroundColor: palette.ground },
});
