// Brief card (build-plan B1/B4): scope, references and the fingerprint check from useContractContent.
// ok → "Brief matches ✓"; mismatch → do not rely on it; noKey → "Open the contract link on this device" (paste);
// missing → no brief was saved. The per-milestone "Done when" lists are shown on the milestone cards.
import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Button, Field } from '@/components/design';
import { fonts, palette, space, status } from '@/constants/design';
import type { ContractContentState } from '@/hooks/useContractContent';
import { Card } from './ui';

export function BriefCard({ content, fingerprint }: { content: ContractContentState; fingerprint: string }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);
  const brief = content.brief;
  const open = async () => {
    setOpening(true);
    setError('');
    const ok = await content.importKey(input);
    setOpening(false);
    if (ok) setInput('');
    else setError('This is not the link of this contract.');
  };
  return (
    <Card>
      <View style={b.head}>
        <Text style={b.title} accessibilityRole="header">
          Brief
        </Text>
        <Text style={b.fp}>Fingerprint {fingerprint}</Text>
      </View>
      {content.contentStatus === 'loading' ? <Text style={b.muted}>Reading the brief…</Text> : null}
      {content.contentStatus === 'ok' && brief ? (
        <>
          <Text style={b.ok}>Brief matches ✓</Text>
          <Text style={b.scope}>{brief.scope}</Text>
          {brief.references.map((r) => (
            <Text key={r} style={b.link} accessibilityRole="link" onPress={() => void Linking.openURL(r)} numberOfLines={1}>
              {r}
            </Text>
          ))}
        </>
      ) : null}
      {content.contentStatus === 'mismatch' ? (
        <View style={[b.notice, { backgroundColor: status.warning.bg }]}>
          <Text style={[b.noticeText, { color: status.warning.ink }]}>
            The brief on this device does not match the contract’s fingerprint. Do not rely on it; ask the other party for the
            contract link.
          </Text>
        </View>
      ) : null}
      {content.contentStatus === 'missing' ? <Text style={b.muted}>No brief was saved with this contract.</Text> : null}
      {content.contentStatus === 'noKey' || content.contentStatus === 'mismatch' ? (
        <View style={b.paste}>
          {content.contentStatus === 'noKey' ? (
            <Text style={b.muted}>Open the contract link on this device to read the brief, or paste the link here.</Text>
          ) : null}
          <Field
            value={input}
            onChangeText={(t) => {
              setInput(t);
              setError('');
            }}
            placeholder="Paste the contract link"
            autoCapitalize="none"
            autoCorrect={false}
            error={error || undefined}
            accessibilityLabel="Paste the contract link"
          />
          <Button title="Open the brief" variant="secondary" compact onPress={() => void open()} disabled={!input.trim()} loading={opening} />
        </View>
      ) : null}
    </Card>
  );
}

const b = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[2], flexWrap: 'wrap', marginBottom: space[2] },
  title: { fontFamily: fonts.display, fontSize: 17, color: palette.ink },
  fp: { fontFamily: fonts.mono, fontSize: 12, color: palette.caption },
  ok: { fontFamily: fonts.bodySemi, fontSize: 14, color: status.success.ink, marginBottom: space[2] },
  scope: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: palette.ink },
  link: { marginTop: space[1], fontFamily: fonts.body, fontSize: 13, color: palette.link, textDecorationLine: 'underline' },
  muted: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.caption },
  notice: { padding: space[3], borderRadius: 14 },
  noticeText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  paste: { marginTop: space[2], gap: space[2] },
});
