import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#0009', padding: 20 }}>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, backgroundColor: '#16101F', borderRadius: 20 }} contentContainerStyle={{ padding: 24, gap: 18 }}>
        <Text style={{ color: 'white', fontSize: 22 }}>{hasPhone ? 'Unlink phone' : 'Link phone'}</Text>
        <Text style={{ color: '#FCD34D' }}>Unverified number · No OTP verification. Only a scrypt hash is sent on-chain. Anyone who knows your number can look up your wallet.</Text>
        {hasPhone && <Text style={{ color: 'white' }}>Enter your linked number if it is not saved on this device. Unlinking returns its account rent to your wallet.</Text>}
        <TextInput accessibilityLabel="Vietnamese phone number" editable={!busy} value={phone} onChangeText={value => { setPhone(value); setPrepared(null); }} keyboardType="phone-pad" placeholder="+84…" placeholderTextColor="#AAA" style={{ padding: 14, color: 'white', borderWidth: 1, borderColor: '#9B4FDE', borderRadius: 12 }} />
        {prepared && <Text style={{ color: 'white', lineHeight: 24 }}>Network fee: {solAmount(prepared.fee)} SOL{'\n'}Account rent: {solAmount(prepared.rent)} SOL{'\n'}Rent returned: {solAmount(prepared.refund)} SOL</Text>}
        {!!error && <Text accessibilityRole="alert" style={{ color: '#FCD34D' }}>{error}</Text>}
        <TouchableOpacity disabled={busy || hasPhone === null} onPress={() => void (prepared ? submit() : prepare())} style={{ backgroundColor: '#7B2FBE', padding: 18, borderRadius: 14, opacity: busy || hasPhone === null ? 0.5 : 1 }}>
          <Text style={{ color: 'white', textAlign: 'center' }}>{busy ? 'Please wait…' : prepared ? `Confirm ${prepared.unlink ? 'unlink' : 'link'} phone` : 'Review SOL cost'}</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={busy} onPress={onClose}><Text style={{ color: '#C9A2F2', textAlign: 'center', padding: 12 }}>Cancel</Text></TouchableOpacity>
      </ScrollView>
    </View>
  </Modal>;
}

export function PhoneManagementModal(props: Props) {
  return props.visible ? <PhoneManagementContent key={props.walletAddress} {...props} /> : null;
}
