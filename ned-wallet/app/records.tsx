// Records (Records / RecordsIntl boards, build-plan B5): milestones released to this wallet, grouped by month, in
// ≈ VND for the Vietnam view and USDC otherwise; CSV export; "not tax advice" line. Data: useRecords (device cache
// `@ned_records_v1:<wallet>` brought up to date from the chain, including contracts closed on another device).
import React, { useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Chip } from '@/components/contracts/ui';
import { Badge, PressableScale, Screen } from '@/components/design';
import { WalletNav } from '@/components/wallet/WalletNav';
import { MASCOT_IMAGES } from '@/constants/mascot';
import { riseStyle, useMotion } from '@/constants/motion';
import { elevation, fonts, palette, radius, space } from '@/constants/design';
import { useRecords } from '@/hooks/useRecords';
import { useRegion } from '@/hooks/useRegion';
import { formatUsdc, usdcFromUnits, vndFromUnits } from '@/services/milestone/format';
import { txExplorerUrl, type RecordMonth, type ReleaseRecord } from '@/services/milestone/records';
import { USD_VND_RATE_DATE } from '@/constants/chain';

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
const vnd = (units: bigint) => `≈ ${vndFromUnits(units).toLocaleString('en-US')} VND`;
const day = (unix: number) => new Date(unix * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const RATE_DAY = new Date(`${USD_VND_RATE_DATE}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Web: download a file; native: the share sheet with the CSV text */
async function exportCsv(csv: string): Promise<void> {
  const name = `ned-records-${new Date().toISOString().slice(0, 10)}.csv`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  await Share.share({ title: name, message: csv });
}

export default function RecordsScreen() {
  const { region } = useRegion();
  const vn = (region ?? 'vn') === 'vn';
  const { months, names, loading, error, csv } = useRecords();
  const { reduce } = useMotion();
  const [exported, setExported] = useState(false);

  const onExport = async () => {
    try {
      await exportCsv(csv());
      setExported(true);
    } catch (err) {
      console.warn('[records] export failed', err);
    }
  };

  const row = (r: ReleaseRecord, i: number) => {
    const units = BigInt(r.amountUnits);
    const partner = r.destination === 'payoutPartner';
    const from = names[r.client] ?? short(r.client);
    return (
      <View key={r.id} style={[styles.row, i > 0 && styles.divider]}>
        <View style={styles.rowTop}>
          <View style={styles.flex}>
            <Text style={styles.rowTitle}>
              {r.title} · Milestone {r.index + 1}
            </Text>
            <Text style={styles.rowMeta}>
              {day(r.releasedAt)} · from {from}
            </Text>
          </View>
          <View style={styles.amount}>
            <Text style={styles.amountValue}>{vn ? vnd(units) : formatUsdc(units)}</Text>
            <Text style={styles.amountSub}>{vn ? `$${usdcFromUnits(units)} · estimate` : partner ? 'to the payout partner' : 'to your N.E.D wallet'}</Text>
          </View>
        </View>
        <View style={styles.rowBottom}>
          <Chip tone="success">{partner ? 'Released to payout partner' : 'Released'}</Chip>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Open the release of ${r.title} milestone ${r.index + 1} in Solana Explorer`}
            onPress={() => void Linking.openURL(txExplorerUrl(r.signature))}
            style={styles.explorer}
          >
            <Text style={styles.explorerText}>Explorer</Text>
            <Feather name="external-link" size={14} color={palette.link} />
          </Pressable>
        </View>
      </View>
    );
  };

  const month = (m: RecordMonth, mi: number) => {
    const n = m.records.length;
    return (
      <Animated.View key={m.key} style={[styles.month, riseStyle(mi + 1, reduce)]}>
        <View style={[styles.summary, elevation.sAccent]}>
          <View style={styles.summaryHead}>
            <Text style={styles.summaryLabel}>{m.label} · received</Text>
            {mi === 0 ? (
              <PressableScale accessibilityRole="button" accessibilityLabel="Export all records as CSV" onPress={() => void onExport()} style={styles.export}>
                <Text style={styles.exportText}>{exported ? 'CSV ready' : 'Export CSV'}</Text>
              </PressableScale>
            ) : null}
          </View>
          <Text style={styles.total} accessibilityRole="header">
            {vn ? vnd(m.totalUnits) : formatUsdc(m.totalUnits)}
          </Text>
          <Text style={styles.totalSub}>
            {vn ? `(estimate) · $${usdcFromUnits(m.totalUnits)} · rate of ${RATE_DAY}` : `${n} ${n === 1 ? 'release' : 'releases'} · devnet test money`}
          </Text>
        </View>
        <View style={styles.card}>{m.records.map(row)}</View>
      </Animated.View>
    );
  };

  return (
    <>
      <Screen contentStyle={styles.content} edges={['top', 'left', 'right']}>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            Records
          </Text>
          <Badge label="Devnet · test money" tone="warning" />
        </View>
        <Animated.Text style={[styles.intro, riseStyle(0, reduce)]}>A record of what you received, for your own tax return, visa or loan. Not tax advice.</Animated.Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {months.length ? (
          <>
            {months.map(month)}
            <Text style={styles.foot}>
              {vn
                ? `VND amounts are estimates at the rate of ${RATE_DAY}. The payout partner is simulated in this demo, so no bank transfer took place.`
                : 'Amounts are devnet test USDC.'}
            </Text>
          </>
        ) : loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.loadingText}>Checking the chain for releases…</Text>
          </View>
        ) : (
          <Animated.View style={[styles.empty, riseStyle(1, reduce)]}>
            <Image source={MASCOT_IMAGES.curious} style={styles.mascot} resizeMode="contain" accessibilityIgnoresInvertColors />
            <Text style={styles.emptyTitle}>Nothing received yet</Text>
            <Text style={styles.emptyBody}>When a milestone is released to you, it is recorded here with its date and an Explorer link.</Text>
          </Animated.View>
        )}

        <Pressable accessibilityRole="link" onPress={() => router.push('/disclosures')} style={styles.disclosures}>
          <Text style={styles.disclosuresText}>Disclosures</Text>
        </Pressable>
      </Screen>
      <WalletNav active="Records" />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[4], paddingBottom: 120, gap: space[3] },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2], paddingHorizontal: space[1], paddingTop: space[1] },
  title: { fontFamily: fonts.display, fontSize: 28, color: palette.ink },
  intro: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: palette.ink2 },
  error: { fontFamily: fonts.body, fontSize: 13, color: '#B42318' },
  month: { gap: space[3] },
  summary: { padding: space[4], borderRadius: radius.xl, backgroundColor: palette.card },
  summaryHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  summaryLabel: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 13, color: palette.ink2 },
  export: { height: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center' },
  exportText: { fontFamily: fonts.bodySemi, fontWeight: '700', fontSize: 12, color: '#FFFFFF' },
  total: { marginTop: space[2], fontFamily: fonts.display, fontSize: 30, color: palette.ink },
  totalSub: { marginTop: 2, fontFamily: fonts.body, fontSize: 12, color: palette.ink2 },
  card: { overflow: 'hidden', borderRadius: radius.xl, backgroundColor: palette.card },
  row: { paddingVertical: 12, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: palette.divider },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink },
  rowMeta: { marginTop: 2, fontFamily: fonts.body, fontSize: 12, color: palette.caption },
  amount: { alignItems: 'flex-end', flexShrink: 0 },
  amountValue: { fontFamily: fonts.monoBold, fontSize: 14, color: palette.ink },
  amountSub: { fontFamily: fonts.body, fontSize: 11, color: palette.caption },
  rowBottom: { marginTop: space[2], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  explorer: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, paddingLeft: space[2] },
  explorerText: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.link },
  foot: { fontFamily: fonts.body, fontSize: 11, lineHeight: 17, color: palette.caption },
  loading: { alignItems: 'center', gap: space[2], paddingTop: space[8] },
  loadingText: { fontFamily: fonts.body, fontSize: 13, color: palette.caption },
  empty: { alignItems: 'center', paddingTop: 30, paddingHorizontal: space[3] },
  mascot: { width: 150, height: 116 },
  emptyTitle: { marginTop: 14, fontFamily: fonts.display, fontSize: 19, color: palette.ink, textAlign: 'center' },
  emptyBody: { marginTop: 6, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: palette.caption, textAlign: 'center' },
  disclosures: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: space[3] },
  disclosuresText: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.link },
});
