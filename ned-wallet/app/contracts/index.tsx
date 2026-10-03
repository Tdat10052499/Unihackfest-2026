// Contracts (main navigation). A simple list until the ContractsList board is built in build-plan B4: title, other
// party, status chip and total in the user's money view. Rows open the dev harness while the detail screen is missing.
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { DText, Notice, PressableScale, Screen } from '@/components/design';
import { WalletNav } from '@/components/wallet/WalletNav';
import { elevation, fonts, palette, radius, space, status } from '@/constants/design';
import { FEATURES } from '@/constants/features';
import { useFunds } from '@/hooks/useFunds';
import type { ChipTone } from '@/services/milestone/view';

const TONE: Record<ChipTone, { bg: string; ink: string; dot: string }> = {
  info: status.info,
  accent: status.accent,
  warning: status.warning,
  success: status.success,
  neutral: status.neutral,
};

export default function ContractsScreen() {
  const router = useRouter();
  const { funds, loading, error } = useFunds();
  return (
    <>
      <Screen contentStyle={styles.content} edges={['top', 'left', 'right']}>
        <DText variant="h1" style={styles.title} accessibilityRole="header">
          Contracts
        </DText>
        {error ? <Notice tone="error">{error}</Notice> : null}
        {loading && !funds.length ? (
          <ActivityIndicator color={palette.accent} style={styles.loading} />
        ) : funds.length === 0 ? (
          <View style={[styles.card, styles.empty]}>
            <DText variant="h3">No contracts yet</DText>
            <DText variant="body" tone="secondary">
              When a client creates a contract with you, or you create one, it shows up here.
            </DText>
          </View>
        ) : (
          <View style={styles.card}>
            {funds.map((f, i) => {
              const tone = TONE[f.tone];
              const other = f.counterparty.username ? `@${f.counterparty.username}` : `${f.counterparty.wallet.slice(0, 4)}…${f.counterparty.wallet.slice(-4)}`;
              return (
                <PressableScale
                  key={f.address}
                  accessibilityRole="button"
                  accessibilityLabel={`${f.title}, ${f.statusLabel}`}
                  disabled={!FEATURES.devTools}
                  onPress={() => router.push(`/dev/milestone` as Href)}
                  style={[styles.row, i > 0 && styles.rowDivider]}
                >
                  <Avatar seed={f.counterparty.wallet} size={40} decorative />
                  <View style={styles.rowText}>
                    <DText variant="bodyLarge" style={styles.rowTitle} numberOfLines={1}>
                      {f.title}
                    </DText>
                    <DText variant="caption" tone="secondary" numberOfLines={1}>
                      {f.role === 'client' ? `to ${other}` : `from ${other}`}
                    </DText>
                    <View style={styles.meta}>
                      <View style={[styles.chip, { backgroundColor: tone.bg }]}>
                        <View style={[styles.dot, { backgroundColor: tone.dot }]} />
                        <DText variant="caption" style={[styles.chipText, { color: tone.ink }]} numberOfLines={1}>
                          {f.statusLabel}
                        </DText>
                      </View>
                      <DText variant="body" style={styles.total} numberOfLines={1}>
                        {f.totalLabel}
                      </DText>
                    </View>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        )}
      </Screen>
      <WalletNav active="Contracts" />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[4], paddingBottom: 120, gap: space[3] },
  title: { paddingHorizontal: space[1], paddingTop: space[2], fontFamily: fonts.display },
  loading: { marginTop: space[8] },
  card: { borderRadius: radius.xl, backgroundColor: palette.card, ...elevation.s1 },
  empty: { padding: space[5], gap: space[2] },
  row: { flexDirection: 'row', gap: space[3], paddingVertical: 14, paddingHorizontal: space[4] },
  rowDivider: { borderTopWidth: 1, borderTopColor: palette.divider },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 15 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2], marginTop: space[1] },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 24, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, flexShrink: 1 },
  dot: { width: 6, height: 6, borderRadius: radius.pill },
  chipText: { fontFamily: fonts.bodySemi },
  total: { fontFamily: fonts.bodySemi, color: palette.ink },
});
