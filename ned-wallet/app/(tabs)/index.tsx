// Home (HomeVN / HomeIntl boards, build-plan B3). Two money views per wallet (decision D18):
// - Vietnam view: what is locked for you in ≈ VND, released to you, Share @user / Records; never a USDC balance;
// - international view: USDC balance, locked amounts, New contract / Receive / Send.
// Both: greeting by time of day + name, Devnet badge, avatar → Settings, needs your action, your contracts, suggestions.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, useFocusEffect, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { Badge, PressableScale, Sheet } from '@/components/design';
import { FlagUS, FlagVN } from '@/components/home/Flags';
import { NAV_HEIGHT } from '@/components/wallet/WalletNav';
import { USD_VND_RATE_DATE } from '@/constants/chain';
import { fonts, palette, radius, space, status } from '@/constants/design';
import { MASCOT_IMAGES } from '@/constants/mascot';
import { useFunds } from '@/hooks/useFunds';
import { useRegion } from '@/hooks/useRegion';
import { useAuth } from '@/services/auth';
import { formatUsdc, usdcFromUnits, vndFromUnits } from '@/services/milestone/format';
import { unsettled } from '@/services/milestone/rules';
import type { ActionKind, ChipTone, FundAccount, FundView } from '@/services/milestone/view';
import { getUsdcTokenBalance } from '@/services/solana';
import { useUserStore } from '@/stores/useUserStore';

type Icon = React.ComponentProps<typeof Feather>['name'];

const TONE: Record<ChipTone, { bg: string; ink: string; dot: string }> = {
  info: status.info,
  accent: status.accent,
  warning: status.warning,
  success: status.success,
  neutral: status.neutral,
};
const NEED_LOOK: Partial<Record<ActionKind, { icon: Icon; tone: ChipTone }>> = {
  accept: { icon: 'check', tone: 'info' },
  lock: { icon: 'lock', tone: 'info' },
  submit: { icon: 'arrow-up', tone: 'accent' },
  approve: { icon: 'eye', tone: 'warning' },
  releaseNow: { icon: 'download', tone: 'success' },
  refundNow: { icon: 'rotate-ccw', tone: 'warning' },
  close: { icon: 'x-circle', tone: 'neutral' },
};

const vnd = (units: bigint) => vndFromUnits(units).toLocaleString('en-US');
const rateDay = new Date(`${USD_VND_RATE_DATE}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
const isMine = (key: { toBase58(): string }, wallet: string) => key.toBase58() === wallet;

function greetingNow(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? 'Good morning,' : h < 18 ? 'Good afternoon,' : 'Good evening,';
}

/** Amounts for the hero and the stats, from the decoded contracts */
function totals(raw: FundAccount[], wallet: string) {
  let lockedForMe = 0n;
  let lockedByMe = 0n;
  let releasedToMe = 0n;
  let lockedForMeContracts = 0;
  let active = 0;
  for (const f of raw) {
    if (f.state !== 'Settled') active += 1;
    const open = f.state === 'Funded' ? unsettled(f) : 0n;
    if (isMine(f.freelancer, wallet)) {
      lockedForMe += open;
      if (open > 0n) lockedForMeContracts += 1;
      releasedToMe += f.released;
    }
    if (isMine(f.client, wallet)) lockedByMe += open;
  }
  return { lockedForMe, lockedByMe, releasedToMe, lockedForMeContracts, active };
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isReady, user, walletAddress } = useAuth();
  const username = useUserStore((s) => s.username);
  const { region } = useRegion();
  const vn = (region ?? 'vn') === 'vn';
  const { funds, raw, loading, error, refresh } = useFunds();
  const [usdc, setUsdc] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [share, setShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (walletAddress) void useUserStore.getState().fetchUserProfile(walletAddress);
  }, [walletAddress]);

  // The Vietnam view never reads or shows a USDC balance (product-spec 4.2)
  const loadBalance = useCallback(async () => {
    if (!walletAddress || vn) return;
    try {
      setUsdc(await getUsdcTokenBalance(walletAddress, true));
    } catch {
      setUsdc(null);
    }
  }, [walletAddress, vn]);

  useFocusEffect(
    useCallback(() => {
      void loadBalance();
      const timer = setInterval(() => void loadBalance(), 30_000);
      return () => clearInterval(timer);
    }, [loadBalance])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), loadBalance()]);
    setRefreshing(false);
  };

  const sums = useMemo(() => totals(raw, walletAddress ?? ''), [raw, walletAddress]);
  const needs = funds.filter((f) => f.needsMyAction && f.nextAction).slice(0, 3);
  const rows = funds.slice(0, 3);

  if (!isReady)
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  if (!user) return <Redirect href="/welcome" />;

  const wallet = walletAddress ?? '';
  const name = username ? `@${username}` : wallet ? short(wallet) : '';
  const atHandle = username ? `@${username}` : '';
  const go = (href: string) => router.push(href as Href);
  const openContracts = () => go('/contracts');

  const copyHandle = async () => {
    if (!atHandle) return;
    await Clipboard.setStringAsync(atHandle);
    setCopied(true);
  };

  return (
    <View style={styles.page}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space[2], paddingBottom: NAV_HEIGHT + insets.bottom + space[8] }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={palette.accent} />}
      >
        {/* Header: greeting + name, Devnet badge, avatar → Settings */}
        <View style={styles.header}>
          <View style={styles.flex} accessibilityRole="header">
            <Text style={styles.greeting}>{greetingNow()}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
          </View>
          <Badge label="Devnet · test money" tone="warning" />
          {wallet ? (
            <PressableScale accessibilityRole="button" accessibilityLabel={`Your profile, ${name}`} onPress={() => go('/settings')} style={styles.avatarButton}>
              <Avatar seed={wallet} size={40} decorative />
            </PressableScale>
          ) : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading && !funds.length ? (
          <ActivityIndicator color={palette.accent} style={styles.spinner} />
        ) : funds.length === 0 ? (
          <EmptyState vn={vn} onShare={() => setShare(true)} onNew={() => go('/contracts/new')} />
        ) : (
          <>
            {/* Hero */}
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <View style={styles.flex}>
                  <Text style={styles.heroLabel}>{vn ? 'Locked for you' : 'USDC balance'}</Text>
                  <Text style={styles.heroValue} accessibilityLiveRegion="polite">
                    {vn ? vnd(sums.lockedForMe) : usdc === null ? '—' : usdc.toFixed(2)}
                    <Text style={styles.heroUnit}>{vn ? ' VND' : ' USDC'}</Text>
                  </Text>
                  <Text style={styles.heroSub}>
                    {vn
                      ? sums.lockedForMe > 0n
                        ? `Estimate · $${usdcFromUnits(sums.lockedForMe)} · ${sums.lockedForMeContracts} contract${sums.lockedForMeContracts === 1 ? '' : 's'} · rate of ${rateDay}`
                        : 'Nothing locked yet · accept a contract to start'
                      : 'Devnet test money'}
                  </Text>
                </View>
                {vn ? <FlagVN /> : <FlagUS />}
              </View>

              {vn ? (
                <View style={styles.quickRow} accessibilityRole="toolbar" accessibilityLabel="Quick actions">
                  <QuickWide
                    icon="share-2"
                    filled
                    title={atHandle ? `Share ${atHandle}` : 'Share profile'}
                    sub="To a client"
                    label={`${atHandle ? `Share ${atHandle}` : 'Share my @username'}: send your username to a client`}
                    onPress={() => setShare(true)}
                  />
                  <QuickWide icon="bar-chart-2" title="Records" sub="Your earnings" label="Records: what you received" onPress={() => go('/records')} />
                </View>
              ) : (
                <View style={styles.quickRow} accessibilityRole="toolbar" accessibilityLabel="Quick actions">
                  <QuickTall icon="plus" filled title="New contract" label="New contract: lock USDC per milestone for a freelancer" onPress={() => go('/contracts/new')} />
                  <QuickTall icon="arrow-down" title="Receive" label="Receive USDC" onPress={() => go('/receive')} />
                  <QuickTall icon="arrow-up" title="Send" label="Send USDC" onPress={() => go('/send')} />
                </View>
              )}

              <View style={styles.stats}>
                <View style={styles.flex}>
                  {/* The chain keeps no release date, so the Vietnam view shows everything released to you so far */}
                  <Text style={styles.statLabel}>{vn ? 'Released to you' : 'Locked in your contracts'}</Text>
                  <Text style={styles.statValue}>{vn ? `≈ ${vnd(sums.releasedToMe)} VND` : formatUsdc(sums.lockedByMe)}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.statLabel}>{vn ? 'Active contracts' : 'Locked for you'}</Text>
                  <Text style={styles.statValue}>{vn ? String(sums.active) : formatUsdc(sums.lockedForMe)}</Text>
                </View>
              </View>
            </View>

            {/* Needs your action */}
            <Text style={styles.sectionTitle} accessibilityRole="header">
              Needs your action
            </Text>
            <View style={styles.card}>
              {needs.length ? (
                needs.map((f, i) => <NeedRow key={f.address} fund={f} first={i === 0} onPress={openContracts} />)
              ) : (
                <Text style={styles.noNeeds}>Nothing needs you right now.</Text>
              )}
            </View>

            {/* Your contracts */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Your contracts
              </Text>
              <Text style={styles.seeAll} accessibilityRole="link" onPress={openContracts}>
                See all
              </Text>
            </View>
            <View style={styles.card}>
              {rows.map((f, i) => (
                <ContractRow key={f.address} fund={f} first={i === 0} vn={vn} onPress={openContracts} />
              ))}
            </View>
          </>
        )}

        {/* Suggested for you */}
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Suggested for you
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggest}>
          {vn ? (
            <Suggestion bg="#EDE3FB" image="happy" title="Share your @username with a client" onPress={() => setShare(true)} />
          ) : (
            <Suggestion bg="#EDE3FB" image="proud" title="Lock a milestone for a freelancer" onPress={() => go('/contracts/new')} />
          )}
          <Suggestion bg="#E3EDFC" icon="info" title='What devnet and "simulated" mean' onPress={() => go('/disclosures')} />
          <Suggestion bg="#E3F5EE" icon="bar-chart-2" title="Keep a record of what you receive" onPress={() => go('/records')} />
        </ScrollView>
      </ScrollView>

      <Sheet visible={share} onClose={() => { setShare(false); setCopied(false); }} title="Share my @username">
        <Text style={styles.sheetText}>
          A client searches <Text style={styles.sheetStrong}>{atHandle || 'your @username'}</Text> in N.E.D to send you a contract.
        </Text>
        <View style={styles.shareBox}>
          <Text style={styles.shareHandle} numberOfLines={1} selectable>
            {atHandle || 'Create your profile first'}
          </Text>
          <PressableScale accessibilityRole="button" accessibilityLabel={copied ? 'Copied' : 'Copy your username'} disabled={!atHandle} onPress={() => void copyHandle()} style={styles.copy}>
            <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
          </PressableScale>
        </View>
        <Text style={styles.sheetNote}>Your @username and wallet address are public on Solana.</Text>
      </Sheet>
    </View>
  );
}

function QuickWide({ icon, title, sub, label, filled, onPress }: { icon: Icon; title: string; sub: string; label: string; filled?: boolean; onPress(): void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.quickWide}>
      <View style={[styles.quickDot, filled && styles.quickDotFilled]}>
        <Feather name={icon} size={16} color={filled ? palette.onAccent : palette.ink} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.quickTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.quickSub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </PressableScale>
  );
}

function QuickTall({ icon, title, label, filled, onPress }: { icon: Icon; title: string; label: string; filled?: boolean; onPress(): void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.quickTall}>
      <View style={[styles.quickDotLarge, filled && styles.quickDotFilled]}>
        <Feather name={icon} size={18} color={filled ? palette.onAccent : palette.ink} />
      </View>
      <Text style={styles.quickTallTitle} numberOfLines={1}>
        {title}
      </Text>
    </PressableScale>
  );
}

function NeedRow({ fund: f, first, onPress }: { fund: FundView; first: boolean; onPress(): void }) {
  const look = NEED_LOOK[f.nextAction!.kind] ?? { icon: 'circle' as Icon, tone: 'accent' as ChipTone };
  const tone = TONE[look.tone];
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} style={[styles.needRow, !first && styles.divider]}>
      <View style={[styles.needIcon, { backgroundColor: tone.bg }]}>
        <Feather name={look.icon} size={18} color={tone.ink} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {f.nextAction!.label}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {f.title} · {f.totalLabel.replace(' (estimate)', '')}
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color={palette.muted} />
    </PressableScale>
  );
}

function ContractRow({ fund: f, first, vn, onPress }: { fund: FundView; first: boolean; vn: boolean; onPress(): void }) {
  const tone = TONE[f.tone];
  const other = f.counterparty.username ? `@${f.counterparty.username}` : short(f.counterparty.wallet);
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${f.title}, ${f.statusLabel}`} onPress={onPress} style={[styles.contractRow, !first && styles.divider]}>
      <Avatar seed={f.counterparty.wallet} size={40} decorative />
      <View style={styles.flex}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {f.title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {f.role === 'client' ? `to ${other}` : `from ${other}`}
        </Text>
        <View style={styles.rowMeta}>
          <View style={[styles.chip, { backgroundColor: tone.bg }]}>
            <View style={[styles.chipDot, { backgroundColor: tone.dot }]} />
            <Text style={[styles.chipText, { color: tone.ink }]} numberOfLines={2}>
              {f.statusLabel}
            </Text>
          </View>
          <View style={styles.amount}>
            <Text style={styles.amountValue} numberOfLines={1}>
              {f.totalLabel.replace(' (estimate)', '')}
            </Text>
            <Text style={styles.amountSub}>{vn ? 'estimate' : 'total'}</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

function Suggestion({ bg, title, image, icon, onPress }: { bg: string; title: string; image?: keyof typeof MASCOT_IMAGES; icon?: Icon; onPress(): void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={[styles.suggestion, { backgroundColor: bg }]}>
      {image ? (
        <Image source={MASCOT_IMAGES[image]} style={styles.suggestImage} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : (
        <View style={styles.suggestIcon}>
          <Feather name={icon ?? 'info'} size={20} color={palette.ink} />
        </View>
      )}
      <Text style={styles.suggestTitle}>{title}</Text>
    </PressableScale>
  );
}

function EmptyState({ vn, onShare, onNew }: { vn: boolean; onShare(): void; onNew(): void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyArt}>
        <Image source={MASCOT_IMAGES.waving} style={styles.emptyImage} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
      <Text style={styles.emptyTitle}>No contracts yet</Text>
      <Text style={styles.emptyBody}>
        {vn ? 'Share your @username with a client. Their contract shows up here.' : 'Lock USDC per milestone for a freelancer. It is released when you approve.'}
      </Text>
      <PressableScale accessibilityRole="button" onPress={vn ? onShare : onNew} style={styles.emptyButton}>
        <Text style={styles.emptyButtonText}>{vn ? 'Share my @username' : 'Create a contract'}</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.ground },
  loading: { flex: 1, justifyContent: 'center', backgroundColor: palette.ground },
  content: { paddingHorizontal: space[4], gap: space[3], width: '100%', maxWidth: 480, alignSelf: 'center' },
  flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space[1], marginBottom: space[1] },
  greeting: { fontFamily: fonts.bodyMedium, fontSize: 14, color: palette.caption },
  name: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: palette.ink },
  avatarButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  error: { fontFamily: fonts.body, fontSize: 13, color: status.error.ink },
  spinner: { marginVertical: space[8] },
  hero: { paddingTop: 18, paddingHorizontal: space[4], paddingBottom: space[4], borderRadius: radius.xl, backgroundColor: palette.card, gap: space[4] },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  heroLabel: { fontFamily: fonts.body, fontSize: 14, color: palette.caption },
  heroValue: { marginTop: 2, fontFamily: fonts.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.8, color: palette.ink },
  heroUnit: { fontSize: 20 },
  heroSub: { marginTop: 2, fontFamily: fonts.body, fontSize: 13, color: palette.caption },
  quickRow: { flexDirection: 'row', gap: space[2] },
  quickWide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[2], height: 64, paddingHorizontal: 10, borderRadius: radius.lg, backgroundColor: palette.field },
  quickTall: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[2], height: 84, paddingHorizontal: 6, borderRadius: radius.lg, backgroundColor: palette.field },
  quickDot: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  quickDotLarge: { width: 38, height: 38, borderRadius: radius.pill, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  quickDotFilled: { backgroundColor: palette.accent },
  quickTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink },
  quickSub: { fontFamily: fonts.body, fontSize: 12, color: palette.caption },
  quickTallTitle: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.ink },
  stats: { flexDirection: 'row', gap: space[3], paddingTop: space[3], borderTopWidth: 1, borderTopColor: palette.divider },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: palette.caption },
  statValue: { marginTop: 2, fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { marginTop: space[3], paddingHorizontal: space[1], fontFamily: fonts.bodySemi, fontSize: 15, color: palette.caption },
  seeAll: { marginTop: space[3], fontFamily: fonts.bodySemi, fontSize: 14, color: palette.link },
  card: { borderRadius: radius.xl, backgroundColor: palette.card },
  divider: { borderTopWidth: 1, borderTopColor: palette.divider },
  needRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], paddingHorizontal: space[4] },
  needIcon: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  noNeeds: { padding: space[4], fontFamily: fonts.body, fontSize: 14, color: palette.caption },
  contractRow: { flexDirection: 'row', gap: space[3], paddingVertical: 14, paddingHorizontal: space[4] },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink },
  rowSub: { marginTop: 1, fontFamily: fonts.body, fontSize: 13, color: palette.caption },
  rowMeta: { marginTop: space[2], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 24, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, flexShrink: 1 },
  chipDot: { width: 6, height: 6, borderRadius: radius.pill },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 12, flexShrink: 1 },
  amount: { alignItems: 'flex-end', flexShrink: 0 },
  amountValue: { fontFamily: fonts.bodySemi, fontWeight: '700', fontSize: 15, color: palette.ink },
  amountSub: { fontFamily: fonts.body, fontSize: 11, color: palette.caption },
  suggest: { gap: 10, paddingHorizontal: space[1], paddingBottom: space[2] },
  suggestion: { width: 168, height: 196, borderRadius: radius.xl, padding: space[4], justifyContent: 'space-between' },
  suggestImage: { width: 136, height: 104, alignSelf: 'center' },
  suggestIcon: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  suggestTitle: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20, color: palette.ink },
  empty: { paddingTop: 28, paddingHorizontal: 20, paddingBottom: space[6], borderRadius: radius.xl, backgroundColor: palette.card, alignItems: 'center', gap: space[3] },
  emptyArt: { width: 168, height: 132, borderRadius: 24, backgroundColor: '#EDE3FB', alignItems: 'center', justifyContent: 'center' },
  emptyImage: { width: 140, height: 112 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: palette.ink },
  emptyBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.caption, textAlign: 'center' },
  emptyButton: { alignSelf: 'stretch', height: 52, borderRadius: radius.pill, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center', marginTop: space[2] },
  emptyButtonText: { fontFamily: fonts.bodySemi, fontSize: 16, color: palette.onAccent },
  sheetText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.caption },
  sheetStrong: { fontFamily: fonts.bodySemi, color: palette.ink },
  shareBox: { marginTop: space[4], flexDirection: 'row', alignItems: 'center', gap: 10, height: 56, paddingLeft: space[4], paddingRight: 6, borderRadius: radius.lg, backgroundColor: palette.field },
  shareHandle: { flex: 1, fontFamily: fonts.mono, fontSize: 14, color: palette.ink },
  copy: { height: 44, paddingHorizontal: space[4], borderRadius: radius.pill, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' },
  copyText: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.onAccent },
  sheetNote: { marginTop: space[3], fontFamily: fonts.body, fontSize: 12, color: palette.caption },
});
