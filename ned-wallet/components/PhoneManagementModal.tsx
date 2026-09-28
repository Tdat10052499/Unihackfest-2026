import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button, Card, DText, InfoRow, Notice } from './design';
import { colors, glass, radius, sizes, space, type } from '../constants/design';
import { PublicKey } from '@solana/web3.js';
import { useAuth } from '../services/auth';
import { buildLinkPhoneTx, buildUnlinkPhoneTx, fetchPhoneRecord, fetchReverseRecord, derivePhonePda } from '../services/identity/dualPda';
import { getPhoneKey } from '../services/identity/phoneKey';
import { getOwnPhone, saveOwnPhone, removeOwnPhone } from '../services/identity/ownPhone';
import { clearIdentityCache, identityConnection } from '../services/identity/resolve';
import { prepareTransactionCost, solAmount } from '../services/identity/transactionCost';
import { useUserStore } from '../stores/useUserStore';

type Prepared = Awaited<ReturnType<typeof prepareTransactionCost>> & { e164: string; unlink: boolean };
interface Props { visible: boolean; onClose(): void; userId: string; walletAddress: string; currentPhone: string | null; onPhoneUpdated(phone: string | null): void }
function PhoneManagementContent({ visible, onClose, walletAddress, onPhoneUpdated }: Props) {
  const { walletAddress: signedInWallet, signAndSendTransaction } = useAuth();
  const [phone, setPhone] = useState('');
  const [hasPhone, setHasPhone] = useState<boolean | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    if (visible && walletAddress) {
      Promise.all([fetchReverseRecord(identityConnection, new PublicKey(walletAddress)), getOwnPhone()]).then(([record, saved]) => {
        if (!active) return;
        setHasPhone(record?.hasPhone ?? null); setPhone(record?.hasPhone ? saved ?? '' : ''); setPrepared(null); setError(record ? '' : 'Create your N.E.D profile first.');
      }).catch(() => { if (active) { setHasPhone(null); setError('Unable to load profile. Close and retry.'); } });
    }
    return () => { active = false; };
  }, [visible, walletAddress]);
  async function prepare() {
    if (lock.current || hasPhone === null) return;
    lock.current = true; setBusy(true); setError('');
    try {
      if (signedInWallet !== walletAddress) throw new Error('The signed-in wallet has changed. Reopen Settings.');
      const owner = new PublicKey(walletAddress);
      const reverse = await fetchReverseRecord(identityConnection, owner);
      if (!reverse) throw new Error('Create your N.E.D profile first.');
      const { e164, phoneKey } = await getPhoneKey(phone);
      const existing = await fetchPhoneRecord(identityConnection, phoneKey);
      if (reverse.hasPhone && !existing?.wallet.equals(owner)) throw new Error('Enter the phone number currently linked to this wallet.');
      if (!reverse.hasPhone && existing) throw new Error("This number is already linked to another N.E.D account. If it's yours, use your @username.");
      const tx = reverse.hasPhone ? buildUnlinkPhoneTx(owner, phoneKey) : buildLinkPhoneTx(owner, phoneKey);
      const rent = reverse.hasPhone ? 0 : await identityConnection.getMinimumBalanceForRentExemption(49);
      const refund = reverse.hasPhone ? (await identityConnection.getAccountInfo(derivePhonePda(phoneKey), 'confirmed'))?.lamports ?? 0 : 0;
      const cost = await prepareTransactionCost(identityConnection, tx, walletAddress, rent, refund);
      setHasPhone(reverse.hasPhone); setPrepared({ ...cost, e164, unlink: reverse.hasPhone });
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to prepare phone change.'); }
    finally { setBusy(false); lock.current = false; }
  }
  async function submit() {
    if (!prepared || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      if (signedInWallet !== walletAddress) throw new Error('The signed-in wallet has changed. Reopen Settings.');
      const balance = await identityConnection.getBalance(new PublicKey(walletAddress));
      if (balance < prepared.total) throw new Error('Not enough devnet SOL for the fee and rent.');
      // Refresh blockhash and quote; never silently accept a higher cost.
      const refreshed = await prepareTransactionCost(identityConnection, prepared.tx, walletAddress, prepared.rent, prepared.refund);
      const rent = prepared.unlink ? 0 : await identityConnection.getMinimumBalanceForRentExemption(49);
      if (refreshed.fee !== prepared.fee || rent !== prepared.rent) { setPrepared(null); throw new Error('Network cost changed. Review again.'); }
      const signature = await signAndSendTransaction(refreshed.tx);
      const result = await identityConnection.confirmTransaction({ signature, blockhash: refreshed.blockhash, lastValidBlockHeight: refreshed.lastValidBlockHeight }, 'confirmed');
      if (result.value.err) throw new Error('Phone change failed on-chain. Reload before retrying.');
      await clearIdentityCache();
      const newPhone = prepared.unlink ? null : prepared.e164;
      if (newPhone) await saveOwnPhone(newPhone); else await removeOwnPhone();
      useUserStore.getState().setLinkedPhone(newPhone);
      setPrepared(null); setHasPhone(!prepared.unlink); setPhone(newPhone ?? '');
      onPhoneUpdated(newPhone); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update phone.'); }
    finally { setBusy(false); lock.current = false; }
  }
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <View style={styles.backdrop}>
      <ScrollView keyboardShouldPersistTaps="handled" style={styles.sheet} contentContainerStyle={styles.sheetContent}>
        <DText variant="h2">{hasPhone ? 'Unlink phone' : 'Link phone'}</DText>
        <Notice tone="warning">Unverified number · No OTP verification. Only a scrypt hash is sent on-chain. Anyone who knows your number can look up your wallet.</Notice>
        {hasPhone && <DText variant="body">Enter your linked number if it is not saved on this device. Unlinking returns its account rent to your wallet.</DText>}
        <TextInput accessibilityLabel="Vietnamese phone number" editable={!busy} value={phone} onChangeText={value => { setPhone(value); setPrepared(null); }} keyboardType="phone-pad" placeholder="+84…" placeholderTextColor={colors.textTertiary} style={styles.input} />
        {prepared && <Card variant="default" padding={space[4]}>
          <InfoRow label="Network fee" value={`${solAmount(prepared.fee)} SOL`} mono />
          <InfoRow label="Account rent" value={`${solAmount(prepared.rent)} SOL`} mono />
          <InfoRow label="Rent returned" value={`${solAmount(prepared.refund)} SOL`} mono last />
        </Card>}
        {!!error && <DText accessibilityRole="alert" variant="caption" tone="error">{error}</DText>}
        <Button disabled={hasPhone === null} loading={busy} onPress={() => void (prepared ? submit() : prepare())} title={prepared ? `Confirm ${prepared.unlink ? 'unlink' : 'link'} phone` : 'Review SOL cost'} />
        <Button variant="ghost" disabled={busy} onPress={onClose} title="Cancel" />
      </ScrollView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', backgroundColor: glass.scrim, padding: space[5] },
  sheet: { flexGrow: 0, width: '100%', maxWidth: sizes.maxContent, alignSelf: 'center', backgroundColor: colors.surface1, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
  sheetContent: { padding: space[6], gap: space[4] },
  input: { ...type.mono, height: sizes.button, paddingHorizontal: space[4], borderWidth: 1, borderColor: colors.brand, borderRadius: radius.md, backgroundColor: colors.surface2 },
});

export function PhoneManagementModal(props: Props) {
  return props.visible ? <PhoneManagementContent key={props.walletAddress} {...props} /> : null;
}
