// New contract (ContractNew1Freelancer / ContractNew2Milestones / ContractNew3Review / ContractCreated boards + B1 brief).
// Step 1: who is the freelancer (@username or wallet, resolved fresh). Step 2: title, milestones (amount, submit-by,
// review time) and the brief (scope, references, "Done when" per milestone; content.ts limits). Step 3: review with
// itemised fees and the brief fingerprint; slide to create. Then the contract link (copy) and its QR code.
// Not available in the Vietnam view (decision D18).
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { Avatar } from '@/components/Avatar';
import { short, windowText } from '@/components/contracts/format';
import { Card, FeesCard, TopBar } from '@/components/contracts/ui';
import { Badge, Button, Field, PressableScale } from '@/components/design';
import { SlideConfirm } from '@/components/wallet/SlideConfirm';
import { fonts, palette, radius, space, status } from '@/constants/design';
import { riseStyle, useMotion } from '@/constants/motion';
import { chainNowSeconds, useChainTime } from '@/hooks/useChainTime';
import { useMilestoneActions } from '@/hooks/useMilestoneActions';
import { useRegion } from '@/hooks/useRegion';
import { useAuth } from '@/services/auth';
import { resolveRecipient, type Recipient } from '@/services/identity/resolve';
import { briefHash, LIMITS, validateBrief, type BriefDraft } from '@/services/milestone/content';
import { shortHash } from '@/services/milestone/evidence';
import { formatDeadline, formatUsdc, unitsFromUsdc } from '@/services/milestone/format';
import { validateDraft } from '@/services/milestone/rules';

const DEADLINES: { label: string; seconds: number }[] = [
  { label: '10 min (demo)', seconds: 600 },
  { label: '1 day', seconds: 86_400 },
  { label: '3 days', seconds: 3 * 86_400 },
  { label: '7 days', seconds: 7 * 86_400 },
  { label: '14 days', seconds: 14 * 86_400 },
];
const REVIEWS: { label: string; seconds: number }[] = [
  { label: '1 min (demo)', seconds: 60 },
  { label: '3 days', seconds: 3 * 86_400 },
  { label: '7 days', seconds: 7 * 86_400 },
];

interface MsForm {
  amount: string;
  deadline: number; // seconds after "now" (chain time at creation)
  review: number;
  name: string;
  criteria: string[];
}
const newMs = (i: number): MsForm => ({ amount: '', deadline: DEADLINES[Math.min(i + 2, 4)].seconds, review: REVIEWS[1].seconds, name: '', criteria: [''] });
const bytes = (s: string) => new TextEncoder().encode(s).length;

export default function NewContractScreen() {
  const insets = useSafeAreaInsets();
  const { walletAddress } = useAuth();
  const { region } = useRegion();
  const vn = (region ?? 'vn') === 'vn';
  const actions = useMilestoneActions();
  const now = useChainTime();
  const { reduce } = useMotion();
  const [step, setStep] = useState<1 | 2 | 3 | 'created'>(1);
  const [query, setQuery] = useState('');
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [looking, setLooking] = useState(false);
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('');
  const [references, setReferences] = useState('');
  const [ms, setMs] = useState<MsForm[]>([newMs(0)]);
  const [created, setCreated] = useState<{ fund: string; inviteLink: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const brief: BriefDraft = useMemo(
    () => ({ scope, references: references.split(/[\s,]+/).filter(Boolean), milestones: ms.map((m) => ({ name: m.name, criteria: m.criteria })) }),
    [scope, references, ms]
  );
  const total = ms.reduce((s, m) => s + (unitsFromUsdc(m.amount) ?? 0n), 0n);
  const titleBytes = bytes(title.trim());
  const draft = recipient
    ? { freelancer: recipient.wallet, title: title.trim(), milestones: ms.map((m) => ({ amountUsdc: m.amount, submitBy: now + m.deadline, reviewSeconds: m.review })), brief }
    : null;
  const draftCheck = draft ? validateDraft(draft, now, walletAddress ?? undefined) : null;
  const briefProblems = validateBrief(brief, ms.length);
  const fieldError = (field: string) => draftCheck?.errors.find((e) => e.field === field)?.message;
  const step2Ok = Boolean(draftCheck?.ok) && briefProblems.length === 0 && titleBytes > 0;

  if (vn) {
    return (
      <View style={[n.page, { paddingTop: insets.top + space[2] }]}>
        <View style={n.pad}>
          <TopBar title="New contract" back="/contracts" />
          <Card>
            <Text style={n.cardTitle}>Not available in the Vietnam view</Text>
            <Text style={n.body}>In the Vietnam view you receive contracts from clients. Share your @username so a client can send you one.</Text>
          </Card>
        </View>
      </View>
    );
  }

  const lookup = async () => {
    setLooking(true);
    setLookupError('');
    setRecipient(null);
    try {
      // fresh: never trust a cached name → wallet mapping before signing (non-ui-plan 3)
      const r = await resolveRecipient(query, { fresh: true });
      if (r.wallet === walletAddress) throw new Error('You cannot create a contract with yourself.');
      setRecipient(r);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'No N.E.D account found.');
    } finally {
      setLooking(false);
    }
  };

  const update = (i: number, patch: Partial<MsForm>) => setMs((list) => list.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  const create = async () => {
    if (!draft) return;
    try {
      // Deadlines are taken from chain time at the moment of signing
      const at = await chainNowSeconds();
      const result = await actions.create({ ...draft, milestones: ms.map((m) => ({ amountUsdc: m.amount, submitBy: at + m.deadline, reviewSeconds: m.review })) });
      setCreated({ fund: result.fund, inviteLink: result.inviteLink });
      setStep('created');
    } catch {
      // actions.error holds the sentence (the key is never in it)
    }
  };

  const who = recipient ? (recipient.username ? `@${recipient.username}` : short(recipient.wallet)) : '';
  const header = (s: number, back: () => void) => (
    <>
      <TopBar title="New contract" back="/contracts" />
      <View accessibilityRole="progressbar" accessibilityLabel={`Step ${s} of 3`} style={n.progress}>
        {[1, 2, 3].map((k) => (
          <View key={k} style={[n.seg, k <= s && n.segOn]} />
        ))}
      </View>
      <Text style={n.stepText}>Step {s} of 3</Text>
      {s > 1 ? (
        <Text style={n.back} accessibilityRole="button" onPress={back}>
          ‹ Back
        </Text>
      ) : null}
    </>
  );

  // ---- created ----
  if (step === 'created' && created) {
    return (
      <View style={n.page}>
        <ScrollView contentContainerStyle={[n.pad, n.center, { paddingTop: insets.top + space[6], paddingBottom: space[6] }]}>
          <Badge label="Devnet · test money" tone="warning" />
          <View style={n.mark}>
            <Feather name="send" size={28} color={status.success.ink} />
          </View>
          <Text style={n.h1} accessibilityRole="header">
            Contract sent to {who}.
          </Text>
          <Text style={n.body}>
            {title.trim()} · {ms.length} milestone{ms.length === 1 ? '' : 's'} · {formatUsdc(total)}. Nothing is locked until {who} accepts.
          </Text>
          <Card style={n.share}>
            <View style={n.qr} accessibilityRole="image" accessibilityLabel="QR code of the contract link">
              <QRCode value={created.inviteLink} size={120} color={palette.ink} backgroundColor={palette.card} />
            </View>
            <Text style={n.shareTitle}>Send this link to {who}</Text>
            <Text style={n.small}>It opens the contract and its brief in N.E.D. The link holds no money, but anyone with it can read the brief.</Text>
            <Button
              title={copied ? 'Copied' : 'Copy contract link'}
              variant="secondary"
              onPress={() => {
                void Clipboard.setStringAsync(created.inviteLink);
                setCopied(true);
              }}
            />
          </Card>
          <Button title="View contract" onPress={() => router.replace(`/contracts/${created.fund}` as Href)} style={n.stretch} />
          <Button title="Back to Home" variant="secondary" onPress={() => router.replace('/home')} style={n.stretch} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={n.page}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[n.pad, { paddingTop: insets.top + space[2], paddingBottom: space[6] }]}>
        {step === 1 ? (
          <Animated.View style={[n.gap, riseStyle(0, reduce)]}>
            {header(1, () => undefined)}
            <Text style={n.h2} accessibilityRole="header">
              Who is the freelancer?
            </Text>
            <Field
              label="N.E.D username or wallet address"
              on="ground"
              value={query}
              onChangeText={(t) => {
                setQuery(t);
                setRecipient(null);
                setLookupError('');
              }}
              onSubmitEditing={() => void lookup()}
              placeholder="@username"
              autoCapitalize="none"
              autoCorrect={false}
              error={lookupError || undefined}
            />
            <Button title="Find" variant="secondary" compact onPress={() => void lookup()} loading={looking} disabled={!query.trim()} />
            {recipient ? (
              <View style={n.result}>
                <Avatar seed={recipient.wallet} size={48} decorative />
                <View style={n.flex}>
                  <Text style={n.resultName}>{who}</Text>
                  <Text style={n.small}>
                    Wallet {short(recipient.wallet)}
                    {recipient.phoneUnverified ? ' · phone not verified' : ''}
                  </Text>
                  <Text style={n.small}>On-chain facts only. Check who you work with yourself.</Text>
                </View>
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        {step === 2 ? (
          <Animated.View style={[n.gap, riseStyle(0, reduce)]}>
            {header(2, () => setStep(1))}
            <Text style={n.h2} accessibilityRole="header">
              Job and milestones
            </Text>
            <Text style={n.small}>For {who}</Text>
            <Field
              label={`Title · ${titleBytes}/32`}
              on="ground"
              value={title}
              onChangeText={setTitle}
              placeholder="Landing page design"
              hint="Public on-chain. Don't include personal info."
              error={titleBytes > 32 ? 'The title is longer than 32 bytes.' : undefined}
            />
            <Field
              label={`Scope · ${[...scope].length}/${LIMITS.scopeChars.toLocaleString('en-US')}`}
              on="ground"
              value={scope}
              onChangeText={setScope}
              placeholder="What will be delivered, and what is not included"
              multiline
              hint="Saved encrypted with the contract. Only people with the contract link can read it."
              error={briefProblems.find((p) => p.field === 'scope' && scope.length > 0)?.message}
            />
            <Field
              label={`References (up to ${LIMITS.references} links)`}
              on="ground"
              value={references}
              onChangeText={setReferences}
              placeholder="https://… (space or comma between links)"
              autoCapitalize="none"
              autoCorrect={false}
              error={briefProblems.find((p) => p.field.startsWith('references'))?.message}
            />
            {ms.map((m, i) => (
              <View key={i} accessibilityLabel={`Milestone ${i + 1}`} style={n.ms}>
                <View style={n.msHead}>
                  <Text style={n.msTitle}>Milestone {i + 1}</Text>
                  {ms.length > 1 ? (
                    <Text style={n.remove} accessibilityRole="button" accessibilityLabel={`Remove milestone ${i + 1}`} onPress={() => setMs((l) => l.filter((_, j) => j !== i))}>
                      Remove
                    </Text>
                  ) : null}
                </View>
                <Field label="Name" value={m.name} onChangeText={(t) => update(i, { name: t })} placeholder="Wireframes" />
                <Field
                  label="Amount (USDC)"
                  value={m.amount}
                  onChangeText={(t) => update(i, { amount: t.replace(',', '.') })}
                  keyboardType="decimal-pad"
                  placeholder="10.00"
                  error={m.amount ? fieldError(`milestones.${i}.amountUsdc`) : undefined}
                />
                <Text style={n.label}>Submit by (deadline for this milestone)</Text>
                <View accessibilityRole="radiogroup" style={n.chips}>
                  {DEADLINES.map((d) => (
                    <Choice key={d.label} label={d.label} on={m.deadline === d.seconds} onPress={() => update(i, { deadline: d.seconds })} />
                  ))}
                </View>
                <Text style={n.small}>{formatDeadline(now + m.deadline)}</Text>
                {fieldError(`milestones.${i}.submitBy`) ? <Text style={n.error}>{fieldError(`milestones.${i}.submitBy`)}</Text> : null}
                <Text style={n.label}>Review time</Text>
                <View accessibilityRole="radiogroup" style={n.chips}>
                  {REVIEWS.map((r) => (
                    <Choice key={r.label} label={r.label} on={m.review === r.seconds} onPress={() => update(i, { review: r.seconds })} />
                  ))}
                </View>
                <Text style={n.label}>Done when</Text>
                {m.criteria.map((c, j) => (
                  <View key={j} style={n.criterionRow}>
                    <View style={n.flex}>
                      <Field
                        value={c}
                        onChangeText={(t) => update(i, { criteria: m.criteria.map((x, k) => (k === j ? t : x)) })}
                        placeholder="e.g. Mobile and desktop layouts"
                        accessibilityLabel={`Done when, point ${j + 1}`}
                      />
                    </View>
                    {m.criteria.length > 1 ? (
                      <Text style={n.remove} accessibilityRole="button" accessibilityLabel={`Remove point ${j + 1}`} onPress={() => update(i, { criteria: m.criteria.filter((_, k) => k !== j) })}>
                        ✕
                      </Text>
                    ) : null}
                  </View>
                ))}
                {m.criteria.length < LIMITS.criteriaPerMilestone ? (
                  <Text style={n.add} accessibilityRole="button" onPress={() => update(i, { criteria: [...m.criteria, ''] })}>
                    + Add a point
                  </Text>
                ) : null}
              </View>
            ))}
            <Button
              title={ms.length >= 5 ? 'Max 5 milestones' : 'Add milestone'}
              variant="secondary"
              icon="plus"
              disabled={ms.length >= 5}
              onPress={() => setMs((l) => [...l, newMs(l.length)])}
            />
            <Card>
              <Text style={n.small}>Total to lock · {ms.length} milestone{ms.length === 1 ? '' : 's'}</Text>
              <Text style={n.total}>{formatUsdc(total)}</Text>
              {fieldError('total') ? <Text style={n.error}>{fieldError('total')}</Text> : null}
            </Card>
          </Animated.View>
        ) : null}

        {step === 3 && draft ? (
          <Animated.View style={[n.gap, riseStyle(0, reduce)]}>
            {header(3, () => setStep(2))}
            <Card>
              <View style={n.result}>
                <Avatar seed={draft.freelancer} size={40} decorative />
                <View style={n.flex}>
                  <Text style={n.resultName}>{who}</Text>
                  <Text style={n.small}>Freelancer · wallet {short(draft.freelancer)}</Text>
                </View>
              </View>
              <Text style={[n.small, { marginTop: space[3] }]}>Title (public on-chain)</Text>
              <Text style={n.cardTitle}>{draft.title}</Text>
            </Card>
            <Card>
              <Text style={n.label}>Milestones</Text>
              {ms.map((m, i) => (
                <View key={i} style={[n.reviewMs, i > 0 && n.divider]}>
                  <View style={n.msHead}>
                    <Text style={n.resultName}>
                      {i + 1}. {m.name.trim() || `Milestone ${i + 1}`}
                    </Text>
                    <Text style={n.mono}>{formatUsdc(unitsFromUsdc(m.amount) ?? 0n)}</Text>
                  </View>
                  <Text style={n.small}>
                    Submit by {formatDeadline(now + m.deadline)} · review {windowText(m.review)}
                  </Text>
                </View>
              ))}
              <View style={[n.msHead, n.divider, { paddingTop: space[3] }]}>
                <Text style={n.resultName}>Total to lock</Text>
                <Text style={n.mono}>{formatUsdc(total)}</Text>
              </View>
            </Card>
            <Card>
              <Text style={n.label}>Brief</Text>
              <Text style={n.body} numberOfLines={4}>
                {scope.trim()}
              </Text>
              <Text style={[n.small, { marginTop: space[2] }]}>
                Fingerprint <Text style={n.mono}>{shortHash(briefHash(draft.title, brief))}</Text> · saved on-chain; the brief itself is encrypted
              </Text>
            </Card>
            <FeesCard partner />
            <Card>
              <Text style={n.label}>What happens next</Text>
              {[
                `${who} accepts and chooses where earnings go.`,
                `You lock ${formatUsdc(total)} in the program vault.`,
                `${who} submits each milestone.`,
                'You approve, or it is released automatically after the review time.',
                'If a submission deadline is missed, that milestone can be refunded to you.',
              ].map((t, i) => (
                <View key={t} style={n.next}>
                  <Text style={n.nextNum}>{i + 1}</Text>
                  <Text style={n.nextText}>{t}</Text>
                </View>
              ))}
            </Card>
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={[n.bar, { paddingBottom: Math.max(insets.bottom, space[4]) + space[2] }]}>
        {step === 1 ? <Button title={recipient ? `Continue with ${who}` : 'Continue'} disabled={!recipient} onPress={() => setStep(2)} /> : null}
        {step === 2 ? (
          <>
            {!step2Ok && briefProblems.length && scope ? <Text style={n.error}>{briefProblems[0].message}</Text> : null}
            <Button title="Review contract" disabled={!step2Ok} onPress={() => setStep(3)} />
          </>
        ) : null}
        {step === 3 ? (
          <>
            {actions.error ? (
              <Text style={n.error} accessibilityRole="alert">
                {actions.error}
              </Text>
            ) : null}
            <SlideConfirm title="Slide to create" busy={actions.busy} busyLabel={actions.status || 'Saving the contract and its brief…'} disabled={!step2Ok} onConfirm={() => void create()} />
            <Text style={n.small}>Nothing is locked yet. You lock after {who} accepts.</Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

function Choice({ label, on, onPress }: { label: string; on: boolean; onPress(): void }) {
  return (
    <PressableScale accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={onPress} style={[n.choice, on && n.choiceOn]}>
      <Text style={[n.choiceText, on && n.choiceTextOn]}>{label}</Text>
    </PressableScale>
  );
}

const n = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.ground },
  pad: { paddingHorizontal: space[4], gap: 10, width: '100%', maxWidth: 480, alignSelf: 'center' },
  center: { alignItems: 'center' },
  stretch: { alignSelf: 'stretch' },
  gap: { gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  progress: { flexDirection: 'row', gap: 6, marginTop: space[2] },
  seg: { flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: palette.hoverGround },
  segOn: { backgroundColor: palette.accent },
  stepText: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.caption },
  back: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.link, alignSelf: 'flex-start', paddingVertical: space[1] },
  h1: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: palette.ink, textAlign: 'center' },
  h2: { fontFamily: fonts.display, fontSize: 22, color: palette.ink },
  cardTitle: { fontFamily: fonts.display, fontSize: 17, color: palette.ink },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.ink2 },
  small: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: palette.caption },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.ink2, marginTop: space[1] },
  error: { fontFamily: fonts.body, fontSize: 12, color: status.error.ink },
  result: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: 14, borderRadius: 18, backgroundColor: palette.tint },
  resultName: { fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink },
  ms: { padding: 14, borderRadius: radius.xl, backgroundColor: palette.card, gap: space[2] },
  msHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[2] },
  msTitle: { fontFamily: fonts.display, fontSize: 15, color: palette.ink },
  remove: { fontFamily: fonts.bodySemi, fontSize: 13, color: status.error.ink, padding: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choice: { height: 38, paddingHorizontal: space[3], borderRadius: 10, backgroundColor: palette.field, justifyContent: 'center' },
  choiceOn: { backgroundColor: palette.tint },
  choiceText: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.ink2 },
  choiceTextOn: { color: palette.ink },
  criterionRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  add: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.link, paddingVertical: space[1] },
  total: { fontFamily: fonts.display, fontSize: 26, color: palette.ink },
  reviewMs: { paddingVertical: space[2], gap: 2 },
  divider: { borderTopWidth: 1, borderTopColor: palette.divider },
  mono: { fontFamily: fonts.monoBold, fontSize: 13, color: palette.ink },
  next: { flexDirection: 'row', gap: 10, marginTop: space[2] },
  nextNum: { width: 22, height: 22, borderRadius: radius.pill, backgroundColor: palette.tint, textAlign: 'center', lineHeight: 22, fontFamily: fonts.bodySemi, fontSize: 12, color: palette.link },
  nextText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.ink2 },
  mark: { width: 64, height: 64, borderRadius: radius.pill, backgroundColor: status.success.bg, alignItems: 'center', justifyContent: 'center', marginTop: space[3] },
  share: { alignSelf: 'stretch', alignItems: 'center', gap: space[2] },
  qr: { padding: space[2], borderRadius: radius.md, backgroundColor: palette.card },
  shareTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink },
  bar: { paddingTop: 10, paddingHorizontal: space[4], gap: space[2], backgroundColor: palette.ground },
});
