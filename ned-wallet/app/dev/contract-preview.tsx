// Dev-only, read-only preview of the contract screens for a public wallet (screenshots of each state, B4a acceptance):
// /dev/contract-preview?wallet=<address>&fund=<address>&view=vn|intl&screen=list|new|detail|accept|lock|locked|submit|review[&k=<key>]
// `k` imports a contract key for that wallet first, as opening the invite link would. FEATURES.devTools builds only.
import React, { useEffect, useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { PublicKey } from '@solana/web3.js';
import ContractsScreen from '../contracts/index';
import NewContractScreen from '../contracts/new';
import SubmitScreen from '../contracts/[fund]/submit';
import ReviewScreen from '../contracts/[fund]/review';
import ContractDetail from '../contracts/[fund]/index';
import AcceptScreen from '../contracts/[fund]/accept';
import LockScreen from '../contracts/[fund]/lock';
import LockedScreen from '../contracts/[fund]/locked';
import { FEATURES } from '../../constants/features';
import { AuthPreviewProvider } from '../../services/auth/AuthProvider';
import { importKeyFromFragment } from '../../services/milestone/keys';
import { contractKeyStorage } from '../../services/milestone/keyStore';
import { useRegionStore } from '../../stores/useRegionStore';

const isAddress = (v: string) => {
  try {
    return new PublicKey(v).toBase58() === v;
  } catch {
    return false;
  }
};
const SCREENS = { list: ContractsScreen, new: NewContractScreen, submit: SubmitScreen, review: ReviewScreen, detail: ContractDetail, accept: AcceptScreen, lock: LockScreen, locked: LockedScreen } as const;

export default function ContractPreview() {
  const { wallet = '', fund = '', view = 'vn', screen = 'detail', k } = useLocalSearchParams<{ wallet?: string; fund?: string; view?: string; screen?: string; k?: string }>();
  const setRegion = useRegionStore((s) => s.setRegion);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void (async () => {
      if (isAddress(wallet)) {
        setRegion(wallet, view === 'intl' ? 'intl' : 'vn');
        if (k && isAddress(fund)) await importKeyFromFragment(contractKeyStorage, wallet, fund, `#k=${k}`);
      }
      setReady(true);
    })();
  }, [wallet, fund, view, k, setRegion]);
  if (!FEATURES.devTools || !isAddress(wallet) || (screen !== 'list' && screen !== 'new' && !isAddress(fund))) return <Redirect href="/" />;
  if (!ready) return null;
  const Screen = SCREENS[(screen as keyof typeof SCREENS) in SCREENS ? (screen as keyof typeof SCREENS) : 'detail'];
  return (
    <AuthPreviewProvider walletAddress={wallet}>
      <Screen />
    </AuthPreviewProvider>
  );
}
