// Locked (ContractLocked board, client) and its mirror for the freelancer (ContractLockedVN): headline, the vault
// proof with Explorer, the rules, and the next step. A state change, so it enters with the 320 ms state motion.
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { short } from '@/components/contracts/format';
import { Card, RulesList } from '@/components/contracts/ui';
import { Badge, Button, PressableScale } from '@/components/design';
import { USD_VND_RATE_DATE } from '@/constants/chain';
import { fonts, palette, radius, space, status } from '@/constants/design';
import { riseStyle, useMotion } from '@/constants/motion';
import { useFund } from '@/hooks/useFund';
import { useRegion } from '@/hooks/useRegion';
import { formatDeadline, usdcFromUnits } from '@/services/milestone/format';

const rateDay = new Date(`${USD_VND_RATE_DATE}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function LockedScreen() {
  const { fund: address = '' } = useLocalSearchParams<{ fund: string }>();
  const insets = useSafeAreaInsets();
  const { region } = useRegion();
  const vn = (region ?? 'vn') === 'vn';
  const { fund } = useFund(address);
  const { reduce } = useMotion();
  if (!fund) return <View style={o.page} />;
  const fl = fund.role === 'freelancer';
  const other = fund.counterparty.username ? `@${fund.counterparty.username}` : short(fund.counterparty.wallet);
  const total = fund.milestones.reduce((s, m) => s + m.amountUnits, 0n);
  const first = fund.milestones.find((m) => m.status === 'pending');
  const amount = fund.totalLabel.replace(' (estimate)', '');
  const headline = fl ? `Locked ${amount} · you can start` : `${amount} locked`;
  const sub = fl
    ? `${vn ? `(estimate) · $${usdcFromUnits(total)} · rate of ${rateDay}. ` : ''}${other} locked the full contract in the program vault.${first ? ` Submit milestone ${first.index + 1} by ${formatDeadline(first.submitBy)}.` : ''}`
    : `${fund.title} is locked in the program vault. ${other} can start work.`;
  const vault = fund.vaultExplorerUrl.replace(/^.*address\/([^?]+).*$/, '$1');
  return (
    <View style={o.page}>
      <ScrollView contentContainerStyle={[o.pad, { paddingTop: insets.top + space[6], paddingBottom: space[6] }]}>
        <Badge label="Devnet · test money" tone="warning" />
        <Animated.View style={[o.head, riseStyle(0, reduce)]}>
          <View style={o.mark}>
            <Feather name="lock" size={30} color={status.success.ink} />
          </View>
          <Text style={o.h1} accessibilityRole="header">
            {headline}
          </Text>
          <Text style={o.sub}>{sub}</Text>
        </Animated.View>
        <Animated.View style={riseStyle(1, reduce)}>
          <PressableScale accessibilityRole="link" onPress={() => void Linking.openURL(fund.vaultExplorerUrl)} style={o.vault}>
            <View style={o.vaultIcon}>
              <Feather name="shield" size={18} color={palette.link} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={o.vaultTitle}>Locked in program vault</Text>
              <Text style={o.vaultSub}>
                Owned by the program, not by N.E.D · <Text style={o.mono}>{short(vault)}</Text>
              </Text>
            </View>
            <Text style={o.link}>Explorer ↗</Text>
          </PressableScale>
        </Animated.View>
        <Animated.View style={riseStyle(2, reduce)}>
          <Card>
            <RulesList />
          </Card>
        </Animated.View>
      </ScrollView>
      <View style={[o.bar, { paddingBottom: Math.max(insets.bottom, space[4]) + space[2] }]}>
        <Button title="View contract" onPress={() => router.replace(`/contracts/${fund.address}` as Href)} />
        <Button title="Back to Home" variant="secondary" onPress={() => router.replace('/home')} />
      </View>
    </View>
  );
}

const o = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.ground },
  pad: { paddingHorizontal: space[4], gap: space[4], width: '100%', maxWidth: 480, alignSelf: 'center' },
  head: { gap: space[2] },
  mark: { width: 64, height: 64, borderRadius: radius.pill, backgroundColor: status.success.bg, alignItems: 'center', justifyContent: 'center' },
  h1: { marginTop: space[2], fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: palette.ink },
  sub: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: palette.ink2 },
  vault: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], paddingHorizontal: space[4], borderRadius: radius.xl, backgroundColor: palette.card },
  vaultIcon: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: palette.tint, alignItems: 'center', justifyContent: 'center' },
  vaultTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink },
  vaultSub: { fontFamily: fonts.body, fontSize: 12, color: palette.caption },
  mono: { fontFamily: fonts.mono, color: palette.ink },
  link: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.link },
  bar: { paddingTop: 10, paddingHorizontal: space[4], gap: space[2], backgroundColor: palette.ground },
});
