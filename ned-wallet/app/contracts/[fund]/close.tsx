// Close contract (ContractClose / ContractClosed boards): only for the creator, when never locked or settled.
// Closing deletes the fund and vault accounts; their rent comes back. Result state with the Explorer link.
import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { short } from '@/components/contracts/format';
import { Card, FeesCard, TopBar } from '@/components/contracts/ui';
import { Button } from '@/components/design';
import { SlideConfirm } from '@/components/wallet/SlideConfirm';
import { fonts, palette, radius, space, status } from '@/constants/design';
import { riseStyle, useMotion } from '@/constants/motion';
import { useFund } from '@/hooks/useFund';
import { useMilestoneActions } from '@/hooks/useMilestoneActions';
import { useAuth } from '@/services/auth';
import { FUND_SIZE, TOKEN_ACCOUNT_SIZE } from '@/services/milestone/layout';

const sol = (lamports: number) => (lamports / 1e9).toFixed(3);

export default function CloseScreen() {
  const { fund: address = '' } = useLocalSearchParams<{ fund: string }>();
  const insets = useSafeAreaInsets();
  const { connection } = useAuth();
  const { fund } = useFund(address);
  const actions = useMilestoneActions(address || undefined);
  const { reduce } = useMotion();
  const [rent, setRent] = useState<number | null>(null);
  const [signature, setSignature] = useState('');

  useEffect(() => {
    Promise.all([connection.getMinimumBalanceForRentExemption(FUND_SIZE), connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE)])
      .then(([a, b]) => setRent(a + b))
      .catch(() => setRent(null));
  }, [connection]);

  const close = async () => {
    try {
      const r = await actions.close();
      setSignature(r.signature);
    } catch {
      // the sentence is in actions.error
    }
  };

  if (signature) {
    return (
      <View style={[c.page, { paddingTop: insets.top + space[8] }]}>
        <View style={[c.pad, c.center]}>
          <View style={c.mark}>
            <Feather name="check" size={30} color={status.success.ink} />
          </View>
          <Text style={c.h1} accessibilityRole="header">
            Contract closed
          </Text>
          <Text style={c.sub}>≈ {rent ? sol(rent) : '0.006'} test SOL rent returned. It no longer shows in Active.</Text>
          <Text style={c.link} accessibilityRole="link" onPress={() => void Linking.openURL(`https://explorer.solana.com/tx/${signature}?cluster=devnet`)}>
            View on Explorer ↗
          </Text>
          <Button title="Back to Contracts" onPress={() => router.replace('/contracts')} style={{ alignSelf: 'stretch', marginTop: space[4] }} />
        </View>
      </View>
    );
  }
  if (!fund) {
    return (
      <View style={[c.page, { paddingTop: insets.top + space[4] }]}>
        <View style={c.pad}>
          <TopBar title="Close contract" />
          <Text style={c.sub}>This contract does not exist any more.</Text>
        </View>
      </View>
    );
  }
  const other = fund.counterparty.username ? `@${fund.counterparty.username}` : short(fund.counterparty.wallet);
  const canClose = fund.actions.includes('close');
  const neverLocked = fund.state === 'created' || fund.state === 'accepted';
  return (
    <View style={c.page}>
      <ScrollView contentContainerStyle={[c.pad, { paddingTop: insets.top + space[2], paddingBottom: space[6] }]}>
        <TopBar title="Close contract" back={`/contracts/${fund.address}`} />
        <Animated.View style={riseStyle(0, reduce)}>
          <Card>
            <View style={c.row}>
              <View style={{ flex: 1 }}>
                <Text style={c.title}>{fund.title}</Text>
                <Text style={c.muted}>
                  to {other} · {neverLocked ? 'never locked' : 'completed'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={c.mono}>{fund.totalLabel.replace(' (estimate)', '')}</Text>
                <Text style={c.muted}>{neverLocked ? 'not locked' : 'settled'}</Text>
              </View>
            </View>
          </Card>
        </Animated.View>
        <Animated.View style={riseStyle(1, reduce)}>
          <Card style={{ gap: space[2] }}>
            <Text style={c.cardTitle}>Close and return rent</Text>
            <Text style={c.body}>
              Closing deletes the contract account on Solana. The rent, about <Text style={c.strong}>{rent ? sol(rent) : '…'} test SOL</Text>, comes back to you.
            </Text>
            <Text style={c.muted}>Only possible when a contract was never locked, or every milestone is done.</Text>
          </Card>
        </Animated.View>
        <FeesCard />
      </ScrollView>
      <View style={[c.bar, { paddingBottom: Math.max(insets.bottom, space[4]) + space[2] }]}>
        {!canClose ? <Text style={c.alert}>This contract cannot be closed now.</Text> : null}
        {actions.error ? (
          <Text style={c.alert} accessibilityRole="alert">
            {actions.error}
          </Text>
        ) : null}
        <SlideConfirm title="Slide to close" disabled={!canClose} busy={actions.busy} busyLabel={actions.status || undefined} onConfirm={() => void close()} />
      </View>
    </View>
  );
}

const c = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.ground },
  pad: { paddingHorizontal: space[4], gap: 10, width: '100%', maxWidth: 480, alignSelf: 'center' },
  center: { alignItems: 'center', gap: space[3] },
  mark: { width: 64, height: 64, borderRadius: radius.pill, backgroundColor: status.success.bg, alignItems: 'center', justifyContent: 'center' },
  h1: { fontFamily: fonts.display, fontSize: 26, color: palette.ink },
  sub: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.ink2, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 16, color: palette.ink },
  cardTitle: { fontFamily: fonts.display, fontSize: 16, color: palette.ink },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.ink2 },
  strong: { fontFamily: fonts.bodySemi, color: palette.ink },
  muted: { fontFamily: fonts.body, fontSize: 12, color: palette.caption },
  mono: { fontFamily: fonts.monoBold, fontSize: 15, color: palette.ink },
  link: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.link },
  alert: { fontFamily: fonts.body, fontSize: 13, color: status.error.ink, textAlign: 'center' },
  bar: { paddingTop: 10, paddingHorizontal: space[4], gap: space[2], backgroundColor: palette.ground },
});
