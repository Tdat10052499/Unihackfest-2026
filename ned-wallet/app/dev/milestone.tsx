// Dev harness for Milestone Lock (non-ui-plan N10, B1 content): unstyled buttons for every useMilestoneActions
// action, the raw useFund(address) state and useContractContent (brief, deliveries, key import). Only in __DEV__ builds or with EXPO_PUBLIC_DEV_TOOLS=1; not linked from the UI.
import React, { useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { Button, DText, Field, Screen } from '../../components/design';
import { FEATURES } from '../../constants/features';
import { useAuth } from '../../services/auth';
import { useChainTime } from '../../hooks/useChainTime';
import { useContractContent } from '../../hooks/useContractContent';
import { useFund } from '../../hooks/useFund';
import { useMilestoneActions } from '../../hooks/useMilestoneActions';
import { useRegion } from '../../hooks/useRegion';
import type { BriefDraft, DeliveryDraft } from '../../services/milestone/content';
import type { ActionKind } from '../../services/milestone/view';

const input = { marginBottom: 8 } as const;
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
  const [links, setLinks] = useState('https://example.com/delivery-v1 https://github.com/example/repo/tree/0123abcd');
  const [scope, setScope] = useState('Landing page for a coffee shop: hero, menu, contact.');
  const [invite, setInvite] = useState('');
  const [freelancer, setFreelancer] = useState('');
  const [amount, setAmount] = useState('1');
  const [minutes, setMinutes] = useState('5');
  const [split, setSplit] = useState('0');
  const [log, setLog] = useState<string[]>([]);
  const { fund, raw, loading } = useFund(address.trim());
  const content = useContractContent(address.trim());
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
  const brief = (): BriefDraft => ({
    scope,
    references: ['https://example.com/style-guide'],
    milestones: [
      { name: 'Wireframes', criteria: ['Mobile and desktop', 'Three sections'] },
      { name: 'Visual design', criteria: ['Uses the style guide'] },
    ],
  });
  const delivery = (): DeliveryDraft => ({ links: links.split(/\s+/).filter(Boolean), files: [], note: `Harness delivery for milestone ${i + 1}` });

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
      <Field on="ground" containerStyle={input} placeholder="freelancer wallet address" value={freelancer} onChangeText={setFreelancer} autoCapitalize="none" />
      <Field on="ground" containerStyle={input} placeholder="USDC per milestone (2 milestones)" value={amount} onChangeText={setAmount} />
      <Field on="ground" containerStyle={input} placeholder="minutes until the submission deadline" value={minutes} onChangeText={setMinutes} />
      <Field on="ground" containerStyle={input} placeholder="brief scope" value={scope} onChangeText={setScope} multiline />
      {button('create 2 milestones', async () => {
        const submitBy = now + Math.round(Number(minutes) * 60);
        const result = await actions.create({
          freelancer: freelancer.trim(),
          title: 'Harness test',
          milestones: [0, 1].map(() => ({ amountUsdc: amount, submitBy, reviewSeconds: 60 })),
          brief: brief(),
        });
        setAddress(result.fund);
        return result;
      })}

      <DText variant="h3">Contract</DText>
      <Field on="ground" containerStyle={input} placeholder="fund address" value={address} onChangeText={setAddress} autoCapitalize="none" />
      <Field on="ground" containerStyle={input} placeholder="milestone index" value={index} onChangeText={setIndex} />
      <Field on="ground" containerStyle={input} placeholder="delivery links (space separated)" value={links} onChangeText={setLinks} autoCapitalize="none" />
      <Field on="ground" containerStyle={input} placeholder="paste the contract link or #k=… to read the brief here" value={invite} onChangeText={setInvite} autoCapitalize="none" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {button('accept own wallet', () => actions.accept('ownWallet'))}
        {button('accept VND (partner)', () => actions.accept('payoutPartner'))}
        {button('lock', () => actions.lock())}
        {button('import contract link', async () => ({ imported: await content.importKey(invite) }))}
        {button('post brief again', () => actions.postBrief(brief()))}
        {button(`submit ${i}`, () => actions.submit(i, delivery()))}
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
        <Field on="ground" containerStyle={input} placeholder="split: base units to the freelancer" value={split} onChangeText={setSplit} />
      ) : null}

      <DText variant="h3">Log</DText>
      {log.slice(0, 10).map((line, n) => (
        <DText key={n} selectable>
          {line}
        </DText>
      ))}

      <DText variant="h3">useContractContent · {content.contentStatus} · key on this device: {String(content.hasKey)}</DText>
      {content.inviteLink ? <DText selectable>invite link: {content.inviteLink}</DText> : null}
      <DText selectable>{json({ brief: content.brief ?? null, deliveries: content.deliveries })}</DText>

      <DText variant="h3">useFund(address) {loading ? '(loading)' : ''}</DText>
      <DText selectable>{json(fund ?? null)}</DText>
      <DText variant="h3">raw</DText>
      <DText selectable>{json(raw ?? null)}</DText>
    </Screen>
  );
}
