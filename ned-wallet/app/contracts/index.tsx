// Contracts (ContractsList / ContractsListMia boards): As freelancer / As client, filters Active · Needs action ·
// Completed, status chips, avatars, empty states; "New contract" for clients outside the Vietnam view (D18),
// "Share my @username" for freelancers.
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/contracts/ui';
import { Badge, Button, PressableScale, Screen } from '@/components/design';
import { WalletNav } from '@/components/wallet/WalletNav';
import { elevation, fonts, palette, radius, space } from '@/constants/design';
import { useFunds } from '@/hooks/useFunds';
import { useRegion } from '@/hooks/useRegion';
import { formatDeadline, usdcFromUnits } from '@/services/milestone/format';
import type { FundView, Role } from '@/services/milestone/view';
import { useUserStore } from '@/stores/useUserStore';

type Filter = 'active' | 'needs' | 'completed';
const FILTERS: [Filter, string][] = [
  ['active', 'Active'],
  ['needs', 'Needs action'],
  ['completed', 'Completed'],
];
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

/** "Milestone 1 due 12 Oct" style line for a row */
function deadline(f: FundView): string {
  if (f.state === 'settled') return 'Completed';
  if (f.state === 'created') return f.role === 'freelancer' ? 'Waiting for you to accept' : 'Waiting to be accepted';
  if (f.state === 'accepted') return f.role === 'client' ? 'Ready to lock' : 'Waiting to be locked';
  const open = f.milestones.find((m) => m.status === 'pending' || m.status === 'submitted' || m.status === 'disputed');
  if (!open) return '';
  if (open.status === 'submitted') return `Review by ${formatDeadline(open.reviewBy)}`;
  return `Milestone ${open.index + 1} due ${formatDeadline(open.submitBy)}`;
}

export default function ContractsScreen() {
  const { region } = useRegion();
  const vn = (region ?? 'vn') === 'vn';
  const username = useUserStore((s) => s.username);
  const { funds, loading, error } = useFunds();
  const [role, setRole] = useState<Role>(vn ? 'freelancer' : 'client');
  const [filter, setFilter] = useState<Filter>('active');
  const [copied, setCopied] = useState(false);

  const rows = useMemo(
    () =>
      funds
        .filter((f) => f.role === role)
        .filter((f) => (filter === 'completed' ? f.state === 'settled' : filter === 'needs' ? f.needsMyAction : f.state !== 'settled')),
    [funds, role, filter]
  );

  const [emptyTitle, emptyBody] =
    filter === 'needs'
      ? ['Nothing needs you', 'Contracts that wait for you show up here.']
      : filter === 'completed'
        ? ['No completed contracts yet', 'When every milestone is released or refunded, the contract moves here.']
        : role === 'freelancer'
          ? ['No contracts yet', 'Share your @username with a client. Their contract shows up here.']
          : ['No contracts yet', vn ? 'Contracts you created as a client show up here.' : 'Create a contract and lock USDC for each milestone.'];

  const share = async () => {
    if (!username) return;
    await Clipboard.setStringAsync(`@${username}`);
    setCopied(true);
  };

  return (
    <>
      <Screen contentStyle={styles.content} edges={['top', 'left', 'right']}>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            Contracts
          </Text>
          <Badge label="Devnet · test money" tone="warning" />
        </View>

        <View accessibilityRole="tablist" accessibilityLabel="Your role" style={[styles.tabs, elevation.s1]}>
          {(['freelancer', 'client'] as Role[]).map((r) => {
            const on = role === r;
            return (
              <Pressable key={r} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setRole(r)} style={[styles.tab, on && styles.tabOn]}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{r === 'freelancer' ? 'As freelancer' : 'As client'}</Text>
              </Pressable>
            );
          })}
        </View>

        <View accessibilityRole="radiogroup" accessibilityLabel="Filter" style={styles.filters}>
          {FILTERS.map(([key, label]) => {
            const on = filter === key;
            return (
              <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setFilter(key)} style={[styles.filter, on && styles.filterOn]}>
                <Text style={[styles.filterText, on && styles.filterTextOn]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading && !funds.length ? (
          <ActivityIndicator color={palette.accent} style={{ marginTop: space[8] }} />
        ) : rows.length ? (
          <View style={styles.card}>
            {rows.map((f, i) => {
              const other = f.counterparty.username ? `@${f.counterparty.username}` : short(f.counterparty.wallet);
              const total = f.milestones.reduce((s, m) => s + m.amountUnits, 0n);
              return (
                <PressableScale
                  key={f.address}
                  accessibilityRole="button"
                  accessibilityLabel={`${f.title}, ${f.statusLabel}`}
                  onPress={() => router.push(`/contracts/${f.address}` as Href)}
                  style={[styles.row, i > 0 && styles.divider]}
                >
                  <Avatar seed={f.counterparty.wallet} size={40} decorative />
                  <View style={styles.flex}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {f.title}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {f.role === 'client' ? `to ${other}` : `from ${other}`}
                      {deadline(f) ? ` · ${deadline(f)}` : ''}
                    </Text>
                    <View style={styles.meta}>
                      <View style={styles.flex}>
                        <Chip tone={f.tone}>{f.statusLabel}</Chip>
                      </View>
                      <View style={styles.amount}>
                        <Text style={styles.amountValue}>{f.totalLabel.replace(' (estimate)', '')}</Text>
                        <Text style={styles.amountSub}>{vn ? `$${usdcFromUnits(total)} · estimate` : 'total'}</Text>
                      </View>
                    </View>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        ) : (
          <View style={[styles.card, styles.empty]}>
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            <Text style={styles.emptyBody}>{emptyBody}</Text>
          </View>
        )}

        {role === 'client' && !vn ? <Button title="New contract" icon="plus" onPress={() => router.push('/contracts/new')} /> : null}
        {role === 'freelancer' ? (
          <Button
            title={copied ? `Copied @${username}` : username ? `Share my @username` : 'Create your profile to share it'}
            variant="secondary"
            icon="share-2"
            disabled={!username}
            onPress={() => void share()}
          />
        ) : null}
      </Screen>
      <WalletNav active="Contracts" />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[4], paddingBottom: 120, gap: space[3] },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[1], paddingTop: space[1] },
  title: { fontFamily: fonts.display, fontSize: 28, color: palette.ink },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: 14, backgroundColor: palette.card },
  tab: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: palette.tint },
  tabText: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink2 },
  tabTextOn: { color: palette.link },
  filters: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
  filter: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: palette.card, justifyContent: 'center' },
  filterOn: { backgroundColor: palette.accent },
  filterText: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.ink2 },
  filterTextOn: { color: palette.onAccent },
  error: { fontFamily: fonts.body, fontSize: 13, color: '#B42318' },
  card: { borderRadius: radius.xl, backgroundColor: palette.card },
  row: { flexDirection: 'row', gap: space[3], paddingVertical: 14, paddingHorizontal: space[4] },
  divider: { borderTopWidth: 1, borderTopColor: palette.divider },
  flex: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink },
  rowSub: { marginTop: 1, fontFamily: fonts.body, fontSize: 13, color: palette.caption },
  meta: { marginTop: space[2], flexDirection: 'row', alignItems: 'center', gap: space[2] },
  amount: { alignItems: 'flex-end' },
  amountValue: { fontFamily: fonts.bodySemi, fontWeight: '700', fontSize: 15, color: palette.ink },
  amountSub: { fontFamily: fonts.body, fontSize: 11, color: palette.caption },
  empty: { padding: space[5], gap: space[2] },
  emptyTitle: { fontFamily: fonts.display, fontSize: 18, color: palette.ink },
  emptyBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.caption },
});
