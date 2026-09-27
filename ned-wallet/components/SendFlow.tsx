import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveRecipient, recipientLabel, type Recipient } from '../services/identity/resolve';
import { prepareUsdcTransfer, type PreparedUsdcTransfer } from '../services/p2pTransfer';
import { solAmount } from '../services/identity/transactionCost';
import { onbBackground, onbFonts, onbPrimaryGradient } from './onboarding/theme';

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
      const nextPrepared = await prepareUsdcTransfer(wallet, fresh.wallet, Number(amount));
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
      const sig = await onSend(fresh.wallet, Number(amount), prepared);
      setSignature(sig || null); setStage('success');
    } catch (err) { setError(err instanceof Error ? err.message : 'Transfer failed.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <LinearGradient colors={onbBackground.colors} style={styles.root}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity disabled={busy} accessibilityLabel="Back" onPress={() => {
          setError(''); setConfirmedPhone(false);
          if (stage === 'recipient' || stage === 'success') onClose();
          else setStage(stage === 'review' ? 'amount' : 'recipient');
        }}><Text style={styles.link}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.title}>{stage === 'review' ? 'Review' : stage === 'success' ? 'Sent' : 'Send'}</Text>
        {onScan && stage === 'recipient' ? <TouchableOpacity onPress={onScan}><Text style={styles.link}>Scan QR</Text></TouchableOpacity> : <View />}
      </View>
      <Text style={styles.muted}>USDC · Solana Devnet</Text>
      {stage === 'recipient' && <>
        <Text style={styles.text}>To</Text>
        <TextInput accessibilityLabel="Recipient" style={styles.input} value={input} onChangeText={changeInput} placeholder="Phone, @username, name.sol or wallet" placeholderTextColor="#999" autoCapitalize="none" autoCorrect={false} />
        <Text style={styles.muted}>Search by Vietnamese phone number, N.E.D username, .sol name or Solana address.</Text>
        {looking && <ActivityIndicator color="#B87AED" />}
      </>}
      {recipient && <View style={styles.card}>
        <Text style={styles.title}>{recipientLabel(recipient)}{recipient.phoneUnverified ? ' · Unverified number' : ''}</Text>
        <Text selectable style={styles.address}>{recipient.wallet}</Text>
        <Text style={styles.muted}>{recipient.source === 'sns' ? `${input.trim()} · SNS Mainnet lookup` : recipient.source === 'ned' ? 'N.E.D' : 'Wallet address'}</Text>
      </View>}
      {stage === 'recipient' && recipient?.source === 'sns' && <Text style={styles.warning}>Lookup only in this demo — .sol names resolve on Mainnet, transfers run on Devnet.</Text>}
      {stage === 'recipient' && <SendButton busy={busy} label="Continue" onPress={() => { setError(''); setStage('amount'); }} disabled={!recipient || looking || recipient.source === 'sns' || recipient.wallet === wallet || !wallet} />}
      {stage === 'amount' && <>
        <Text style={styles.title}>Amount in USDC</Text>
        <TextInput accessibilityLabel="Amount in USDC" style={[styles.input, styles.amount]} value={amount} onChangeText={value => { if (/^\d{0,9}(\.\d{0,6})?$/.test(value)) setAmount(value); }} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#999" />
        <View style={styles.header}>{[5, 10, 20, 50].map(n => <TouchableOpacity key={n} onPress={() => setAmount(String(n))}><Text style={styles.link}>${n}</Text></TouchableOpacity>)}</View>
        {balance != null && <Text style={styles.muted}>Cash available: {balance.toFixed(2)} USDC</Text>}
        <Text style={styles.muted}>You pay the SOL network fee and any recipient account rent. Exact cost is shown at review.</Text>
        <SendButton busy={busy} label="Review" onPress={review} disabled={!Number.isFinite(Number(amount)) || Number(amount) <= 0 || (balance != null && Number(amount) > balance)} />
      </>}
      {(stage === 'review' || stage === 'success') && <>
        <Text style={styles.amount}>{stage === 'success' ? 'Sent ' : ''}${Number(amount).toFixed(2)}</Text>
        <View style={styles.card}>
          <Text style={styles.text}>{amount} USDC</Text>
          <Text style={styles.text}>Network fee: {solAmount(cost?.fee ?? 0)} SOL</Text>
          <Text style={styles.text}>Recipient account rent: {solAmount(cost?.rent ?? 0)} SOL</Text>
        </View>
      </>}
      {stage === 'review' && <>
        {recipient?.phoneUnverified && <View style={styles.card}>
          <Text style={styles.warning}>Unverified number. This number has not been verified by OTP. Confirm the recipient through another channel.</Text>
          <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: confirmedPhone }} disabled={busy} onPress={() => setConfirmedPhone(!confirmedPhone)}>
            <Text style={styles.link}>{confirmedPhone ? '☑' : '☐'} Is this @{recipient.username}?</Text>
          </TouchableOpacity>
        </View>}
        <SendButton busy={busy} label="Confirm and send" onPress={send} disabled={!!recipient?.phoneUnverified && !confirmedPhone} />
      </>}
      {stage === 'success' && <>
        <Text style={styles.text}>Your transfer is confirmed on Devnet.</Text>
        {signature && <TouchableOpacity onPress={() => void Linking.openURL(`https://explorer.solana.com/tx/${signature}?cluster=devnet`)}><Text style={styles.link}>View on Solana Explorer</Text></TouchableOpacity>}
        <SendButton busy={busy} label="Done" onPress={onClose} />
        <SendButton busy={busy} label="Send again" onPress={() => { setStage('amount'); setConfirmedPhone(false); setSignature(null); setCost(null); setPrepared(null); }} />
      </>}
      {!!error && <Text accessibilityRole="alert" style={styles.warning}>{error}</Text>}
    </ScrollView>
  </LinearGradient>;
}
const styles = StyleSheet.create({
  root: { flex: 1 }, content: { padding: 20, gap: 18, flexGrow: 1, maxWidth: 560, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: 'white', fontFamily: onbFonts.heading, fontSize: 18 }, text: { color: 'white', fontFamily: onbFonts.body, fontSize: 14, lineHeight: 22 },
  muted: { color: '#B9B2C5', fontFamily: onbFonts.body, fontSize: 12, lineHeight: 19 }, link: { color: '#C9A2F2', fontFamily: onbFonts.bodySemi, paddingVertical: 12 },
  warning: { color: '#FCD34D', lineHeight: 22 }, address: { color: '#C9C3D4', fontFamily: onbFonts.mono, fontSize: 12 },
  card: { padding: 16, borderRadius: 16, gap: 10, borderWidth: 1, borderColor: '#ffffff25', backgroundColor: '#ffffff0c' },
  input: { color: 'white', backgroundColor: '#ffffff0c', borderWidth: 1, borderColor: '#9B4FDE', borderRadius: 16, padding: 16, fontSize: 16 },
  amount: { color: 'white', fontFamily: onbFonts.heading, fontSize: 42, textAlign: 'center' },
  button: { minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', padding: 12 }, buttonText: { color: 'white', fontFamily: onbFonts.heading, fontSize: 17 },
});

function SendButton({ label, onPress, busy, disabled = false }: { label: string; onPress(): void; busy: boolean; disabled?: boolean }) {
  return <TouchableOpacity accessibilityRole="button" disabled={disabled || busy} onPress={onPress} style={{ opacity: disabled || busy ? 0.45 : 1 }}>
    <LinearGradient colors={onbPrimaryGradient} style={styles.button}><Text style={styles.buttonText}>{busy ? 'Please wait…' : label}</Text></LinearGradient>
  </TouchableOpacity>;
}
