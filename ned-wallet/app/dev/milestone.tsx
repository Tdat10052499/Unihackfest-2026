// Dev harness for Milestone Lock (non-ui-plan N10): unstyled buttons for every useMilestoneActions action and
// the raw useFund(address) state. Only in __DEV__ builds or with EXPO_PUBLIC_DEV_TOOLS=1; not linked from the UI.
import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Button, DText, Screen } from '../../components/design';
import { FEATURES } from '../../constants/features';
import { useAuth } from '../../services/auth';
import { useChainTime } from '../../hooks/useChainTime';
import { useFund } from '../../hooks/useFund';
import { useMilestoneActions } from '../../hooks/useMilestoneActions';
import { useRegion } from '../../hooks/useRegion';
import type { ActionKind } from '../../services/milestone/view';

const input = { borderWidth: 1, borderColor: '#888', padding: 8, marginBottom: 8, color: '#fff' } as const;
const json = (value: unknown) =>
  JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? `${v}n` : v?.constructor?.name === 'PublicKey' ? v.toBase58() : v instanceof Uint8Array ? `[${v.length} bytes]` : v), 2);

export default function MilestoneHarness() {
  if (!FEATURES.devTools) return <Redirect href="/" />;
  return <Harness />;
}

function Harness() {
  const { walletAddress } = useAuth();
  const now = useChainTime();
  const { region, setRegion } = useRegion();
  const [address, setAddress] = useState('');
  const [index, setIndex] = useState('0');
  const [link, setLink] = useState('https://example.com/delivery');
  const [freelancer, setFreelancer] = useState('');
  const [amount, setAmount] = useState('1');
  const [minutes, setMinutes] = useState('5');
  const [split, setSplit] = useState('0');
  const [log, setLog] = useState<string[]>([]);
  const { fund, raw, loading } = useFund(address.trim());
  const actions = useMilestoneActions(address.trim() || undefined);
  const i = Number(index) || 0;

  const run = (label: string, action: () => Promise<unknown>) => async () => {
    try {
      const result = await action();
      setLog((l) => [`✅ ${label}: ${json(result)}`, ...l]);
    } catch (err) {
      setLog((l) => [`❌ ${label}: ${err instanceof Error ? err.message : String(err)}`, ...l]);
    }
  };

  const button = (title: string, action: () => Promise<unknown>) => (
    <Button key={title} title={title} compact variant="outline" disabled={actions.busy} onPress={run(title, action)} />
  );
  const preview = (kind: ActionKind) => button(`preview ${kind}`, () => actions.preview(kind, i));

  return (
    <Screen>
      <DText variant="h2">Milestone Lock harness (dev)</DText>
      <DText>wallet {walletAddress ?? '(signed out)'}</DText>
      <DText>chain time {now} · region {region} · busy {String(actions.busy)} · {actions.status}</DText>
      {actions.error ? <DText tone="error">{actions.error}</DText> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 }}>
        {button('region vn', async () => setRegion('vn'))}
        {button('region intl', async () => setRegion('intl'))}
      </View>

      <DText variant="h3">Create (client)</DText>
      <TextInput style={input} placeholder="freelancer wallet address" placeholderTextColor="#888" value={freelancer} onChangeText={setFreelancer} autoCapitalize="none" />
      <TextInput style={input} placeholder="USDC per milestone (2 milestones)" placeholderTextColor="#888" value={amount} onChangeText={setAmount} />
      <TextInput style={input} placeholder="minutes until the submission deadline" placeholderTextColor="#888" value={minutes} onChangeText={setMinutes} />
      {button('create 2 milestones', async () => {
        const submitBy = now + Math.round(Number(minutes) * 60);
        const result = await actions.create({
          freelancer: freelancer.trim(),
          title: 'Harness test',
          milestones: [0, 1].map(() => ({ amountUsdc: amount, submitBy, reviewSeconds: 60 })),
        });
        setAddress(result.fund);
        return result;
      })}

      <DText variant="h3">Contract</DText>
      <TextInput style={input} placeholder="fund address" placeholderTextColor="#888" value={address} onChangeText={setAddress} autoCapitalize="none" />
      <TextInput style={input} placeholder="milestone index" placeholderTextColor="#888" value={index} onChangeText={setIndex} />
      <TextInput style={input} placeholder="delivery link" placeholderTextColor="#888" value={link} onChangeText={setLink} autoCapitalize="none" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {button('accept own wallet', () => actions.accept('ownWallet'))}
        {button('accept VND (partner)', () => actions.accept('payoutPartner'))}
        {button('lock', () => actions.lock())}
        {button(`submit ${i}`, () => actions.submit(i, link))}
        {button(`approve ${i}`, () => actions.approve(i))}
        {button(`release ${i}`, () => actions.releaseNow(i))}
        {button(`refund ${i}`, () => actions.refundNow(i))}
        {button('close', () => actions.close())}
        {actions.dispute ? button(`dispute ${i}`, () => actions.dispute!(i)) : null}
        {actions.concede ? button(`concede ${i}`, () => actions.concede!(i)) : null}
        {actions.proposeSplit ? button(`propose split ${split} units`, () => actions.proposeSplit!(BigInt(split || '0'))) : null}
        {actions.acceptSplit ? button('accept split', () => actions.acceptSplit!()) : null}
        {preview('lock')}
        {preview('approve')}
        {preview('close')}
      </View>
      {actions.proposeSplit ? (
        <TextInput style={input} placeholder="split: base units to the freelancer" placeholderTextColor="#888" value={split} onChangeText={setSplit} />
      ) : null}

      <DText variant="h3">Log</DText>
      {log.slice(0, 10).map((line, n) => (
        <DText key={n} selectable>
          {line}
        </DText>
      ))}

      <DText variant="h3">useFund(address) {loading ? '(loading)' : ''}</DText>
      <DText selectable>{json(fund ?? null)}</DText>
      <DText variant="h3">raw</DText>
      <DText selectable>{json(raw ?? null)}</DText>
    </Screen>
  );
}
