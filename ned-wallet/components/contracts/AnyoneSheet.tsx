// "Release now" / "Refund now" (ContractAnyoneAction board): anyone may do it once the deadline passed. Bottom sheet
// with what happens, itemised fees and a slide; the result replaces the slide (with an Explorer link).
import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Button, Sheet } from '@/components/design';
import { SlideConfirm } from '@/components/wallet/SlideConfirm';
import { fonts, palette, space, status } from '@/constants/design';
import type { MilestoneActions } from '@/hooks/useMilestoneActions';
import { formatDeadline } from '@/services/milestone/format';
import type { FundView, MilestoneView } from '@/services/milestone/view';
import { FeesCard } from './ui';

const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

export function AnyoneSheet({
  kind,
  fund,
  ms,
  partyName,
  actions,
  onClose,
}: {
  kind: 'releaseNow' | 'refundNow' | null;
  fund: FundView;
  ms?: MilestoneView;
  partyName: (role: 'client' | 'freelancer') => string;
  actions: MilestoneActions;
  onClose(): void;
}) {
  const [signature, setSignature] = useState('');
  const rel = kind === 'releaseNow';
  const close = () => {
    setSignature('');
    onClose();
  };
  const run = async () => {
    if (!ms) return;
    try {
      const r = rel ? await actions.releaseNow(ms.index) : await actions.refundNow(ms.index);
      setSignature(r.signature);
    } catch {
      // actions.error holds the sentence
    }
  };
  const rows: [string, string][] = ms
    ? rel
      ? [
          ['Milestone', `${fund.title} · ${ms.amountLabel.replace(' (estimate)', '')}`],
          ['Review time ended', formatDeadline(ms.reviewBy)],
          ['Goes to', fund.destination?.kind === 'payoutPartner' ? `VND via payout partner for ${partyName('freelancer')} (simulated)` : `${partyName('freelancer')}’s wallet`],
        ]
      : [
          ['Milestone', `${fund.title} · Milestone ${ms.index + 1}`],
          ['Submission deadline', `${formatDeadline(ms.submitBy)} (passed)`],
          ['Goes to', `${partyName('client')} (client)`],
        ]
    : [];
  return (
    <Sheet visible={kind !== null} onClose={close} title={rel ? 'Release now' : 'Refund now'}>
      <Text style={a.text}>
        {rel
          ? 'The review time has passed. Anyone can release this milestone to the freelancer’s destination.'
          : 'The submission deadline passed. Anyone can refund this milestone to the client.'}
      </Text>
      <View style={a.rows}>
        {rows.map(([k, v], i) => (
          <View key={k} style={[a.row, i > 0 && a.divider]}>
            <Text style={a.k}>{k}</Text>
            <Text style={a.v}>{v}</Text>
          </View>
        ))}
      </View>
      <FeesCard partner={rel && fund.destination?.kind === 'payoutPartner'} />
      {actions.error ? <Text style={a.error}>{actions.error}</Text> : null}
      {signature ? (
        <View style={a.done}>
          <Text style={a.doneText}>{rel ? 'Released ✓' : 'Refunded ✓'}</Text>
          <Text style={a.link} accessibilityRole="link" onPress={() => void Linking.openURL(explorerTx(signature))}>
            View on Explorer
          </Text>
          <Button title="Done" onPress={close} />
        </View>
      ) : (
        <View style={{ marginTop: space[4] }}>
          <SlideConfirm title={rel ? 'Slide to release' : 'Slide to refund'} busy={actions.busy} busyLabel={actions.status || undefined} onConfirm={() => void run()} />
          <Button title="Cancel" variant="secondary" onPress={close} />
        </View>
      )}
    </Sheet>
  );
}

const a = StyleSheet.create({
  text: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.ink2 },
  rows: { marginVertical: space[3], padding: 14, borderRadius: 16, backgroundColor: palette.field },
  row: { paddingVertical: 10, gap: 2 },
  divider: { borderTopWidth: 1, borderTopColor: '#E6E6EB' },
  k: { fontFamily: fonts.body, fontSize: 12, color: palette.caption },
  v: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink },
  error: { marginTop: space[3], fontFamily: fonts.body, fontSize: 13, color: status.error.ink },
  done: { marginTop: space[4], gap: space[3], alignItems: 'stretch' },
  doneText: { fontFamily: fonts.display, fontSize: 20, color: status.success.ink, textAlign: 'center' },
  link: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.link, textAlign: 'center' },
});
