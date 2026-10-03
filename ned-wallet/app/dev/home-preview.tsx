// Dev-only preview of Home for a public wallet, in either money view, without a login (screenshots, B3 acceptance):
// /dev/home-preview?wallet=<address>&view=vn|intl. Only in __DEV__ or EXPO_PUBLIC_DEV_TOOLS=1 builds; read-only.
import React, { useEffect, useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { PublicKey } from '@solana/web3.js';
import HomeScreen from '../(tabs)/index';
import { WalletNav } from '../../components/wallet/WalletNav';
import { FEATURES } from '../../constants/features';
import { AuthPreviewProvider } from '../../services/auth/AuthProvider';
import { useRegionStore } from '../../stores/useRegionStore';

const isAddress = (v: string) => {
  try {
    return new PublicKey(v).toBase58() === v;
  } catch {
    return false;
  }
};

export default function HomePreview() {
  const { wallet = '', view = 'vn' } = useLocalSearchParams<{ wallet?: string; view?: string }>();
  const setRegion = useRegionStore((s) => s.setRegion);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (isAddress(wallet)) setRegion(wallet, view === 'intl' ? 'intl' : 'vn');
    setReady(true);
  }, [wallet, view, setRegion]);
  if (!FEATURES.devTools || !isAddress(wallet)) return <Redirect href="/" />;
  if (!ready) return null;
  return (
    <AuthPreviewProvider walletAddress={wallet}>
      <HomeScreen />
      <WalletNav active="Home" />
    </AuthPreviewProvider>
  );
}
