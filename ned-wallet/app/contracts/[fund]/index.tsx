// Contract detail (ContractDetail board, every state × role × view; build-plan B4a). Role-aware: "Next ·" banner,
// "anyone can do this" banner, other party, hero with vault proof, destination, Brief card (B1), milestone timeline with
// chain-time countdowns, rules, Disclosures, contract ID, "Copy contract link", and the context action bar.
// The Vietnam view never shows client actions (D18). P1 actions only with FEATURES.dispute.
import React, { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { Avatar } from '@/components/Avatar';
import { AnyoneSheet } from '@/components/contracts/AnyoneSheet';
import { BriefCard } from '@/components/contracts/BriefCard';
import { MilestoneCard } from '@/components/contracts/MilestoneCard';
import { Card, Chip, RulesList, Tag, TopBar } from '@/components/contracts/ui';
import { Badge, Button, PressableScale } from '@/components/design';
import { USD_VND_RATE_DATE } from '@/constants/chain';
import { elevation, fonts, palette, radius, space, status } from '@/constants/design';
import { riseStyle, useMotion } from '@/constants/motion';
import { useChainTime } from '@/hooks/useChainTime';
import { useContractContent } from '@/hooks/useContractContent';
import { useFund } from '@/hooks/useFund';
import { useMilestoneActions } from '@/hooks/useMilestoneActions';
import { useRegion } from '@/hooks/useRegion';
import { useAuth } from '@/services/auth';
import { usdcFromUnits } from '@/services/milestone/format';
import type { FundView } from '@/services/milestone/view';

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
const rateDay = new Date(`${USD_VND_RATE_DATE}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function ContractDetail() {
  const { fund: address = '' } = useLocalSearchParams<{ fund: string }>();
  const insets = useSafeAreaInsets();
  const { walletAddress } = useAuth();
  const { region } = useRegion();
  const vn = (region ?? 'vn') === 'vn';
  const { fund, raw, loading } = useFund(address);
  const content = useContractContent(address);
  const actions = useMilestoneActions(address || undefined);
  const now = useChainTime();
  const { reduce } = useMotion();
  const [sheet, setSheet] = useState<'releaseNow' | 'refundNow' | null>(null);
  const [copied, setCopied] = useState<'' | 'id' | 'link'>('');

  const isParty = Boolean(raw && walletAddress && (raw.client.toBase58() === walletAddress || raw.freelancer.toBase58() === walletAddress));
  const fl = fund?.role === 'freelancer';

  const anyMs = useMemo(() => {
    if (!fund) return undefined;
    const rel = fund.milestones.find((m) => m.actions.includes('releaseNow'));
    if (rel) return { kind: 'releaseNow' as const, ms: rel };
    const ref = fund.milestones.find((m) => m.actions.includes('refundNow'));
    return ref ? { kind: 'refundNow' as const, ms: ref } : undefined;
  }, [fund]);

  if (!fund) {
    return (
      <View style={[d.page, { paddingTop: insets.top + space[4] }]}>
        <View style={d.pad}>
          <TopBar title="Contract" />
          <Text style={d.muted}>{loading ? 'Reading the contract from the chain…' : 'This contract does not exist on devnet, or it was closed.'}</Text>
        </View>
      </View>
    );
  }

  const other = fund.counterparty.username ? `@${fund.counterparty.username}` : short(fund.counterparty.wallet);
  const me = fl ? 'freelancer' : 'client';
  const partyName = (role: 'client' | 'freelancer') => (role === me ? 'you' : other);
  const funded = fund.state === 'funded' || fund.state === 'settled';
  const totalUnits = fund.milestones.reduce((s, m) => s + m.amountUnits, 0n);
  // D18: in the Vietnam view a client sees the contract but no client actions
  const clientBlocked = vn && !fl;

  const wait = waitText(fund, fl, other, clientBlocked);
  const brief = content.brief;

  const copy = async (what: 'id' | 'link') => {
    await Clipboard.setStringAsync(what === 'id' ? fund.address : (content.inviteLink ?? ''));
    setCopied(what);
  };

  // ---- the action bar ----
  const bar: { label: string; primary: boolean; onPress(): void; disabled?: boolean; note?: string }[] = [];
  if (isParty && !clientBlocked) {
    if (fund.actions.includes('accept')) bar.push({ label: 'Accept and choose where earnings go', primary: true, onPress: () => router.push(`/contracts/${fund.address}/accept` as Href) });
    if (fund.actions.includes('lock')) bar.push({ label: `Lock ${fund.totalLabel.replace(' (estimate)', '')}`, primary: true, onPress: () => router.push(`/contracts/${fund.address}/lock` as Href) });
    const next = fund.nextAction;
    // Release now / Refund now (below) replaces the other steps, as on the board's "review passed" state
    if ((next?.kind === 'submit' || next?.kind === 'approve') && !anyMs) {
      const page = next.kind === 'submit' ? 'submit' : 'review';
      bar.push({ label: next.label, primary: true, onPress: () => router.push(`/contracts/${fund.address}/${page}?i=${next.milestone ?? 0}` as Href) });
    }
    if (fund.actions.includes('close')) bar.push({ label: 'Close contract', primary: bar.length === 0, onPress: () => router.push(`/contracts/${fund.address}/close` as Href) });
    if (fund.state === 'settled' && fl) bar.push({ label: 'See records', primary: false, onPress: () => router.push('/records') });
  }
  // Release now / Refund now: anyone may do it, in both views (it moves money only along the contract's rules)
  if (anyMs) {
    bar.unshift({ label: anyMs.kind === 'releaseNow' ? 'Release now' : 'Refund now', primary: true, onPress: () => setSheet(anyMs.kind) });
  }

  return (
    <View style={d.page}>
      <ScrollView contentContainerStyle={[d.pad, { paddingTop: insets.top + space[2], paddingBottom: space[8] }]}>
        <TopBar title={fund.title} badge={false} />
        <Animated.View style={[d.gap, riseStyle(0, reduce)]}>
          <View style={d.chips}>
            <Chip tone={fund.tone}>{fund.statusLabel}</Chip>
            <Badge label="DEVNET" tone="warning" />
          </View>
          {wait ? (
            <View style={d.wait}>
              <Feather name="clock" size={15} color={status.info.ink} />
              <Text style={d.waitText}>
                <Text style={d.waitStrong}>Next · </Text>
                {wait}
              </Text>
            </View>
          ) : null}
          {anyMs ? (
            <PressableScale accessibilityRole="button" onPress={() => setSheet(anyMs.kind)} style={[d.banner, { backgroundColor: anyMs.kind === 'releaseNow' ? status.success.bg : status.warning.bg }]}>
              <View style={d.bannerTop}>
                <Text style={d.bannerTitle}>{anyMs.kind === 'releaseNow' ? 'Release now' : 'Refund now'}</Text>
                <Tag>ANYONE CAN DO THIS</Tag>
              </View>
              <Text style={d.bannerText}>
                {anyMs.kind === 'releaseNow'
                  ? 'The review time has passed. Anyone can release this milestone to the freelancer’s destination.'
                  : 'The submission deadline passed. Anyone can refund this milestone to the client.'}
              </Text>
            </PressableScale>
          ) : null}
          {fl && fund.state === 'funded' && fund.milestones.every((m) => m.status === 'pending') ? (
            <PressableScale accessibilityRole="button" onPress={() => router.push(`/contracts/${fund.address}/locked` as Href)} style={[d.banner, { backgroundColor: status.success.bg }]}>
              <Text style={d.bannerTitle}>Locked · you can start</Text>
              <Text style={d.bannerText}>{other} locked the full contract in the program vault. See what this means.</Text>
            </PressableScale>
          ) : null}
          {fund.tooLate ? (
            <View style={[d.banner, { backgroundColor: status.error.bg }]}>
              <Text style={d.bannerText}>
                {fl
                  ? `Not enough time left to accept: the milestone 1 deadline is too close to leave a work window. Ask ${other} to create a new contract.`
                  : `Not enough time left: the milestone 1 deadline is too close for ${other} to work. Close this contract (the rent comes back) and create a new one.`}
              </Text>
            </View>
          ) : null}
          {clientBlocked && isParty ? (
            <View style={[d.banner, { backgroundColor: status.info.bg }]}>
              <Text style={d.bannerText}>You are the client of this contract. Client actions are not available in the Vietnam view; switch it off in Settings to lock, review or close.</Text>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View style={[d.party, riseStyle(1, reduce)]}>
          <Avatar seed={fund.counterparty.wallet} size={42} decorative />
          <View style={d.flex}>
            <View style={d.partyRow}>
              <Text style={d.partyName}>{other}</Text>
              <Tag>{fl ? 'CLIENT' : 'FREELANCER'}</Tag>
            </View>
            <Text style={d.muted}>{fl ? 'Locks the money · you deliver' : 'Delivers the work · you lock the money'}</Text>
          </View>
        </Animated.View>

        <Animated.View style={riseStyle(2, reduce)}>
          <Card accent>
            <Text style={d.heroLabel}>
              {fund.state === 'settled' ? 'Settled' : funded ? (fl ? 'Locked for you' : `Locked for ${other}`) : 'Contract total'}
            </Text>
            <Text style={d.heroAmt}>{(funded && fund.state !== 'settled' ? fund.lockedLabel : fund.totalLabel).replace(' (estimate)', '')}</Text>
            <Text style={d.heroSub}>
              {vn ? `(estimate) · $${usdcFromUnits(totalUnits)} · rate of ${rateDay}` : `${fund.milestones.length} milestone${fund.milestones.length === 1 ? '' : 's'} · devnet test money`}
            </Text>
            <View style={d.dest}>
              <Text style={d.destLabel}>Earnings go to:</Text>
              <Text style={d.destValue}>{fund.destination ? fund.destination.label.replace(' (simulated)', '') : `chosen by ${fl ? 'you' : other} when accepting`}</Text>
              {fund.destination?.simulated ? <Tag>SIMULATED</Tag> : null}
            </View>
            {funded ? (
              <PressableScale accessibilityRole="link" onPress={() => void Linking.openURL(fund.vaultExplorerUrl)} style={d.vault}>
                <Text style={d.vaultText} numberOfLines={1}>
                  Held by the program, not by N.E.D
                </Text>
                <Text style={d.vaultLink}>Explorer ↗</Text>
              </PressableScale>
            ) : (
              <View style={d.notFunded}>
                <Text style={d.notFundedText}>{fund.state === 'accepted' ? 'Not locked yet · the client locks next' : 'Not locked yet · the freelancer has to accept'}</Text>
              </View>
            )}
          </Card>
        </Animated.View>

        <Animated.View style={riseStyle(3, reduce)}>
          <BriefCard content={content} fingerprint={fund.briefHash} />
        </Animated.View>

        <Animated.View style={[d.gap, riseStyle(4, reduce)]}>
          <Text style={d.h2} accessibilityRole="header">
            Milestones
          </Text>
          {fund.milestones.map((ms) => (
            <MilestoneCard
              key={ms.index}
              ms={ms}
              now={now}
              vn={vn}
              usdSub={`$${usdcFromUnits(ms.amountUnits)} · estimate`}
              {...(brief?.milestones[ms.index] ? { name: brief.milestones[ms.index].name, criteria: brief.milestones[ms.index].criteria } : {})}
            />
          ))}
        </Animated.View>

        <Card style={d.infoCard}>
          <Text style={d.infoTitle}>How this contract works</Text>
          <RulesList items={['Each milestone is released when the client approves, or automatically when its review time ends.', 'If a submission deadline passes with nothing submitted, anyone can refund that milestone to the client.', 'The money sits in a program vault. Nobody, including N.E.D, can move it any other way.']} />
          <PressableScale accessibilityRole="link" onPress={() => router.push('/disclosures')} style={[d.infoRow, d.divider]}>
            <Text style={d.infoRowText}>Disclosures</Text>
            <Feather name="chevron-right" size={18} color={palette.muted} />
          </PressableScale>
          <View style={[d.infoRow, d.divider]}>
            <Text style={d.idText}>
              Contract ID <Text style={d.mono}>{short(fund.address)}</Text>
            </Text>
            <Text style={d.copy} accessibilityRole="button" onPress={() => void copy('id')}>
              {copied === 'id' ? 'Copied' : 'Copy'}
            </Text>
          </View>
          {content.inviteLink && isParty ? (
            <View style={[d.linkRow, d.divider]}>
              <View style={d.infoRow}>
                <Text style={d.infoRowText}>Copy contract link</Text>
                <Text style={d.copy} accessibilityRole="button" accessibilityLabel="Copy contract link" onPress={() => void copy('link')}>
                  {copied === 'link' ? 'Copied' : 'Copy'}
                </Text>
              </View>
              <Text style={d.warnText}>Opens this contract with its brief on another device. Anyone with the link can read the brief, but cannot move money. Share it only with the other party.</Text>
            </View>
          ) : null}
        </Card>
      </ScrollView>

      {bar.length ? (
        <View style={[d.bar, { paddingBottom: Math.max(insets.bottom, space[4]) + space[2] }]}>
          {bar.map((b) => (
            <View key={b.label}>
              <Button title={b.label} variant={b.primary ? 'primary' : 'secondary'} onPress={b.onPress} disabled={b.disabled} />
              {b.note ? <Text style={d.barNote}>{b.note}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      <AnyoneSheet kind={sheet} fund={fund} ms={anyMs?.ms} partyName={partyName} actions={actions} onClose={() => setSheet(null)} />
    </View>
  );
}

/** The "Next ·" line of the board for the states where this user waits for the other party */
function waitText(f: FundView, fl: boolean, other: string, clientBlocked: boolean): string {
  if (f.tooLate) return '';
  if (f.state === 'created' && !fl) return `Waiting for ${other} to accept. Nothing is locked yet.`;
  if (f.state === 'accepted' && fl) return `Waiting for ${other} to lock. Don’t start work until this says Locked.`;
  if (f.state === 'funded') {
    const pending = f.milestones.find((m) => m.status === 'pending' && m.countdown);
    const submitted = f.milestones.find((m) => m.status === 'submitted' && m.countdown);
    if (submitted && fl) return `In review. It is released automatically when the review time ends, or earlier when ${other} approves.`;
    if (pending && !fl && !submitted) return `Waiting for ${other} to submit milestone ${pending.index + 1}.`;
    if (clientBlocked && submitted) return `${other} submitted milestone ${submitted.index + 1}. It is released automatically when the review time ends.`;
  }
  return '';
}

const d = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.ground },
  pad: { paddingHorizontal: space[4], gap: space[3], width: '100%', maxWidth: 480, alignSelf: 'center' },
  gap: { gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  muted: { fontFamily: fonts.body, fontSize: 12, color: palette.caption, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  wait: { flexDirection: 'row', gap: 10, paddingVertical: space[3], paddingHorizontal: 14, borderRadius: 16, backgroundColor: status.info.bg },
  waitText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.ink2 },
  waitStrong: { fontFamily: fonts.bodySemi, color: status.info.ink },
  banner: { padding: 14, borderRadius: 18, gap: 6 },
  bannerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerTitle: { fontFamily: fonts.display, fontSize: 16, color: palette.ink },
  bannerText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.ink2 },
  party: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], paddingHorizontal: 14, borderRadius: radius.xl, backgroundColor: palette.card },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  partyName: { fontFamily: fonts.monoBold, fontSize: 15, color: palette.ink },
  heroLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.ink2 },
  heroAmt: { marginTop: 2, fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: palette.ink },
  heroSub: { fontFamily: fonts.body, fontSize: 12, color: palette.ink2 },
  dest: { marginTop: space[3], flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
  destLabel: { fontFamily: fonts.body, fontSize: 13, color: palette.ink2 },
  destValue: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.ink, flexShrink: 1 },
  vault: { marginTop: space[3], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: space[2], paddingHorizontal: 10, borderRadius: radius.md, backgroundColor: palette.tint },
  vaultText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: palette.ink2 },
  vaultLink: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.link },
  notFunded: { marginTop: space[3], paddingVertical: 10, paddingHorizontal: space[3], borderRadius: radius.md, backgroundColor: palette.field },
  notFundedText: { fontFamily: fonts.body, fontSize: 12, color: palette.ink2 },
  h2: { marginTop: space[2], fontFamily: fonts.display, fontSize: 17, color: palette.ink },
  infoCard: { gap: space[3] },
  infoTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, gap: space[2] },
  infoRowText: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink },
  divider: { borderTopWidth: 1, borderTopColor: palette.divider },
  idText: { fontFamily: fonts.body, fontSize: 13, color: palette.caption },
  mono: { fontFamily: fonts.mono, color: palette.ink },
  copy: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.link, paddingHorizontal: space[2], paddingVertical: space[2] },
  linkRow: { paddingBottom: space[1] },
  warnText: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: status.warning.ink },
  bar: { paddingTop: 10, paddingHorizontal: space[4], gap: space[2], backgroundColor: palette.card, ...elevation.s1 },
  barNote: { marginTop: space[1], textAlign: 'center', fontFamily: fonts.body, fontSize: 12, color: palette.caption },
});
