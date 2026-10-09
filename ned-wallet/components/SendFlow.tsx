import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { resolveRecipient, recipientLabel, shortAddress, type Recipient } from '../services/identity/resolve';
import { prepareUsdcTransfer, type PreparedUsdcTransfer } from '../services/p2pTransfer';
import { solAmount } from '../services/identity/transactionCost';
import { AmbientGlow, Badge, Button, Card, DText, Header, IconButton, InfoRow, Notice } from './design';
import { colors, fonts, glass, gradients, radius, shadows, sizes, space, type } from '../constants/design';
import { MASCOT_IMAGES } from '../constants/mascot';
import { amountNumber, sanitizeAmountInput } from '../utils/amountInput';

interface Props {
  wallet: string | null;
  initialRecipient?: string;
  balance?: number | null;
  onClose(): void;
  onScan?(): void;
  onSend(wallet: string, amountUsdc: number, prepared: PreparedUsdcTransfer): Promise<string | void>;
}
type Cost = { fee: number; rent: number; total: number };
export function SendFlow({ wallet, initialRecipient = '', balance, onClose, onScan, onSend }: Props) {
  const [input, setInput] = useState(initialRecipient);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState('');
  const [stage, setStage] = useState<'recipient' | 'amount' | 'review' | 'success'>('recipient');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [looking, setLooking] = useState(false);
  const [confirmedPhone, setConfirmedPhone] = useState(false);
  const [cost, setCost] = useState<Cost | null>(null);
  const [prepared, setPrepared] = useState<PreparedUsdcTransfer | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!input.trim()) { setRecipient(null); setLooking(false); return; }
      setLooking(true);
      try {
        const found = await resolveRecipient(input);
        if (active) { setRecipient(found); setError(''); }
      } catch (err) {
        if (active) { setRecipient(null); setError(err instanceof Error ? err.message : 'Lookup failed. Please retry.'); }
      } finally { if (active) setLooking(false); }
    }, 400);
    return () => { active = false; clearTimeout(timer); };
  }, [input]);
  function changeInput(text: string) {
    setInput(text); setRecipient(null); setError(''); setLooking(!!text.trim()); setConfirmedPhone(false); setCost(null); setPrepared(null);
  }
  async function review() {
    if (!wallet || !recipient || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const fresh = await resolveRecipient(input, { fresh: true });
      setRecipient(fresh); setConfirmedPhone(false);
      const nextPrepared = await prepareUsdcTransfer(wallet, fresh.wallet, amount);
      setPrepared(nextPrepared);
      setCost(nextPrepared);
      setStage('review');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to prepare transfer.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function send() {
    if (!wallet || !recipient || !cost || !prepared || lock.current || (recipient.phoneUnverified && !confirmedPhone)) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const fresh = await resolveRecipient(input, { fresh: true });
      if (fresh.wallet !== recipient.wallet || fresh.username !== recipient.username || fresh.phoneUnverified !== recipient.phoneUnverified) {
        setRecipient(fresh); setConfirmedPhone(false); setStage('amount'); setCost(null); setPrepared(null);
        throw new Error('Recipient changed. Review and confirm the new recipient.');
      }
      // The reviewed transaction is passed through to signing; do not rebuild it here.
      const sig = await onSend(fresh.wallet, amountNumber(amount), prepared);
      setSignature(sig || null); setStage('success');
    } catch (err) { setError(err instanceof Error ? err.message : 'Transfer failed.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const goBack = () => {
    setError(''); setConfirmedPhone(false);
    if (stage === 'recipient' || stage === 'success') onClose();
    else setStage(stage === 'review' ? 'amount' : 'recipient');
  };
  const sendAgain = () => { setStage('amount'); setConfirmedPhone(false); setSignature(null); setCost(null); setPrepared(null); };
  const shown = Number(amount).toFixed(2);
  const overBalance = balance != null && amountNumber(amount) > balance;
  return <LinearGradient colors={gradients.screen} locations={gradients.screenLocations} style={styles.root}>
    {stage === 'success' ? <AmbientGlow preset="success" /> : null}
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      {stage !== 'success' && <Header
        title={stage === 'review' ? 'Review' : 'Send'}
        onBack={busy ? undefined : goBack}
        right={onScan && stage === 'recipient' ? <IconButton icon="maximize" accessibilityLabel="Scan QR" onPress={onScan} /> : undefined}
      />}
      {stage === 'recipient' && <>
        <DText variant="body" tone="secondary" style={styles.fieldLabel}>To</DText>
        <View style={[styles.search, !!input && styles.searchActive]}>
          <Feather name="search" size={18} color={colors.textTertiary} />
          <TextInput accessibilityLabel="Recipient" style={styles.searchInput} value={input} onChangeText={changeInput} placeholder="Phone, @username, name.sol or wallet" placeholderTextColor={colors.textTertiary} autoCapitalize="none" autoCorrect={false} />
          {looking && <ActivityIndicator color={colors.purple[300]} />}
        </View>
        <DText variant="caption" tone="secondary">Search by Vietnamese phone number, N.E.D username, .sol name or Solana address.</DText>
        <DText variant="caption" tone="tertiary">USDC · Solana Devnet</DText>
      </>}
      {recipient && stage !== 'success' && <RecipientCard recipient={recipient} input={input} />}
      {stage === 'recipient' && recipient?.source === 'sns' && <Notice tone="warning">Lookup only in this demo — .sol names resolve on Mainnet, transfers run on Devnet.</Notice>}
      {stage === 'recipient' && <View style={styles.push}><Button loading={busy} title="Continue" onPress={() => { setError(''); setStage('amount'); }} disabled={!recipient || looking || recipient.source === 'sns' || recipient.wallet === wallet || !wallet} /></View>}
      {stage === 'amount' && <>
        <View style={styles.amountBlock}>
          <View style={styles.amountRow}>
            <DText variant="hero" style={styles.dollar}>$</DText>
            <TextInput accessibilityLabel="Amount in USDC" style={styles.amountInput} value={amount} onChangeText={value => setAmount(sanitizeAmountInput(value, 6).display)} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.textTertiary} />
          </View>
          <DText variant="body" tone="secondary" align="center">≈ {amountNumber(amount).toFixed(2)} USDC</DText>
        </View>
        <View style={styles.chips}>{[5, 10, 20, 50].map(n => <Pressable key={n} accessibilityRole="button" onPress={() => setAmount(String(n))} style={({ pressed }) => [styles.chip, pressed && styles.pressed]}><DText variant="button">${n}</DText></Pressable>)}</View>
        <View style={styles.metaRow}>
          {balance != null ? <DText variant="caption" tone={overBalance ? 'error' : 'secondary'}>Available: {balance.toFixed(2)} USDC</DText> : <View />}
        </View>
        <DText variant="caption" tone="secondary">The SOL network fee and any recipient account rent come from your wallet. The exact cost is itemised at review.</DText>
        <View style={styles.push}><Button loading={busy} title="Review" onPress={review} disabled={amountNumber(amount) <= 0 || overBalance} /></View>
      </>}
      {stage === 'review' && <>
        <View style={styles.amountBlock}>
          <DText variant="body" tone="secondary" align="center">You&apos;re sending</DText>
          <DText variant="hero" align="center">${shown}</DText>
          <DText variant="mono" tone="secondary" align="center">{amount} USDC</DText>
        </View>
        {recipient && <RecipientCard recipient={recipient} input={input} />}
        <Card>
          <InfoRow label="From" value="Your wallet · USDC" />
          {recipient ? <InfoRow label="To wallet" value={shortAddress(recipient.wallet)} mono /> : null}
          <InfoRow label="Network fee" value={`${solAmount(cost?.fee ?? 0)} SOL`} mono />
          <InfoRow label="Recipient account rent" value={`${solAmount(cost?.rent ?? 0)} SOL`} mono />
          <InfoRow label="Arrives" value="In a few seconds" last />
        </Card>
        {recipient?.phoneUnverified && <Notice tone="warning">
          <DText variant="caption" tone="primary">Unverified number. This number has not been verified by OTP. Confirm the recipient through another channel.</DText>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmedPhone }} disabled={busy} onPress={() => setConfirmedPhone(!confirmedPhone)} style={styles.check}>
            <Feather name={confirmedPhone ? 'check-square' : 'square'} size={18} color={colors.warningText} />
            <DText variant="body" tone="primary" style={styles.checkText}>Is this @{recipient.username}?</DText>
          </Pressable>
        </Notice>}
        <View style={styles.push}><Button loading={busy} title="Confirm and send" onPress={send} disabled={!!recipient?.phoneUnverified && !confirmedPhone} /></View>
      </>}
      {stage === 'success' && <>
        <View style={styles.successTop}>
          <Image source={MASCOT_IMAGES.happy} style={styles.mascot} resizeMode="contain" accessibilityIgnoresInvertColors />
          <DText variant="h1" align="center" accessibilityRole="header">Sent ${shown}</DText>
          <DText variant="body" tone="secondary" align="center">Your transfer is confirmed on Devnet.</DText>
        </View>
        <Card>
          {recipient ? <InfoRow label="To" value={recipientLabel(recipient)} mono /> : null}
          <InfoRow label="Amount" value={`${amount} USDC`} mono />
          <InfoRow label="Network fee" value={`${solAmount(cost?.fee ?? 0)} SOL`} mono />
          <InfoRow label="Recipient account rent" value={`${solAmount(cost?.rent ?? 0)} SOL`} mono last />
        </Card>
        {signature && <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`https://explorer.solana.com/tx/${signature}?cluster=devnet`)} style={styles.explorer}>
          <DText variant="body" tone="accent" style={styles.explorerText}>View on Solana Explorer</DText>
          <Feather name="arrow-up-right" size={15} color={colors.textAccent} />
        </Pressable>}
        <View style={styles.push}>
          <Button loading={busy} title="Done" onPress={onClose} />
          <Button loading={busy} variant="secondary" title="Send again" onPress={sendAgain} />
        </View>
      </>}
      {!!error && <View accessibilityRole="alert"><Notice tone="error">{error}</Notice></View>}
    </ScrollView>
  </LinearGradient>;
}

/** Recipient card: initial · name · address / source · N.E.D / .SOL / Unverified label */
function RecipientCard({ recipient, input }: { recipient: Recipient; input: string }) {
  const label = recipientLabel(recipient);
  const initials = (recipient.username ?? input.trim() ?? '?').replace(/^@/, '').slice(0, 2).toUpperCase() || '?';
  return <Card style={styles.recipient}>
    <View style={styles.avatar}><DText variant="button">{initials}</DText></View>
    <View style={styles.flex}>
      <DText variant="bodyLarge" style={styles.recipientName} numberOfLines={1}>{label}</DText>
      <DText variant="mono" tone="secondary" style={styles.recipientAddress} selectable>{recipient.wallet}</DText>
      <DText variant="caption" tone="secondary">{recipient.source === 'sns' ? `${input.trim()} · SNS Mainnet lookup` : recipient.source === 'ned' ? 'N.E.D' : 'Wallet address'}</DText>
      {recipient.phoneUnverified ? <Badge icon="alert-triangle" tone="warning" label="Unverified number" style={styles.unverified} /> : null}
    </View>
    {recipient.source === 'ned' ? <Badge tone="accent" label="N.E.D" /> : recipient.source === 'sns' ? <Badge tone="info" label=".SOL" /> : null}
  </Card>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  content: { padding: space[5], gap: space[4], flexGrow: 1, maxWidth: sizes.maxContent, width: '100%', alignSelf: 'center' },
  fieldLabel: { marginBottom: -space[2] },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 56, paddingHorizontal: space[4],
    borderRadius: radius.lg, borderWidth: 1, borderColor: glass.borderStrong, backgroundColor: glass.fill,
  },
  searchActive: { borderColor: glass.focusBorder, boxShadow: shadows.focusRing },
  searchInput: { ...type.bodyLarge, flex: 1, minWidth: 0, minHeight: 52 },
  recipient: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  avatar: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.purple[400], alignItems: 'center', justifyContent: 'center', boxShadow: shadows.brandGlow },
  recipientName: { fontFamily: fonts.displaySemi },
  recipientAddress: { fontSize: 12, lineHeight: 17 },
  unverified: { marginTop: space[1] },
  amountBlock: { alignItems: 'center', gap: space[1], paddingVertical: space[4] },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  dollar: { marginRight: 2 },
  amountInput: { ...type.hero, minWidth: 60, maxWidth: 260, textAlign: 'center', padding: 0 },
  chips: { flexDirection: 'row', gap: space[2] },
  chip: {
    flex: 1, height: sizes.touch, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: glass.fill, borderWidth: 1, borderColor: glass.border,
  },
  pressed: { backgroundColor: colors.surface3 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  check: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: sizes.touch },
  checkText: { fontFamily: fonts.bodySemi },
  push: { marginTop: 'auto', gap: space[3], paddingTop: space[4] },
  successTop: { alignItems: 'center', gap: space[2], paddingTop: space[10] },
  mascot: { width: 150, height: 130, marginBottom: space[2] },
  explorer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[1], minHeight: sizes.touch },
  explorerText: { fontFamily: fonts.bodySemi },
});
