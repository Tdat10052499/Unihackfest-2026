// /c/[fund] — the invite link in the phone app (build-plan B4b). Order matters:
//   1. routeInvite() decides the destination (always this build: the Workspace router already split by device);
//   2. only here: signed in → import the key for this wallet, clear the fragment (history.replaceState on web),
//      open the contract; signed out → keep the invite on this device, clear the fragment, sign in first.
// Public route (app/_layout PUBLIC_SEGMENTS), so the auth gate never drops the fragment.
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import * as Linking from 'expo-linking';
import { PublicKey } from '@solana/web3.js';
import { palette } from '@/constants/design';
import { useAuth } from '@/services/auth';
import { fragmentOf, routeInvite, stashInvite } from '@/services/milestone/invite';
import { importKeyFromFragment } from '@/services/milestone/keys';
import { contractKeyStorage } from '@/services/milestone/keyStore';

const isFund = (v: string) => {
  try {
    return new PublicKey(v).toBase58() === v;
  } catch {
    return false;
  }
};

function clearFragment() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  }
}

export default function InviteRoute() {
  const { fund = '' } = useLocalSearchParams<{ fund: string }>();
  const { isReady, isAuthenticated, walletAddress } = useAuth();
  const url = Linking.useURL();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const hash = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hash : fragmentOf(url);
    // 1. Destination first: nothing is imported or cleared before this
    const route = routeInvite({
      fund,
      hash,
      width: Platform.OS === 'web' && typeof window !== 'undefined' ? window.innerWidth : 390,
      host: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.host : 'app',
    });
    if (route.kind === 'redirect') {
      done.current = true;
      if (typeof window !== 'undefined') window.location.replace(route.url);
      return;
    }
    if (!isFund(fund)) {
      done.current = true;
      clearFragment();
      router.replace('/');
      return;
    }
    if (!isReady) return;
    done.current = true;
    clearFragment();
    void (async () => {
      if (isAuthenticated && walletAddress) {
        if (hash) await importKeyFromFragment(contractKeyStorage, walletAddress, fund, hash);
        router.replace(`/contracts/${fund}` as Href);
      } else {
        if (hash) await stashInvite(fund, hash);
        router.replace('/welcome');
      }
    })();
  }, [fund, url, isReady, isAuthenticated, walletAddress]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ground }}>
      <ActivityIndicator color={palette.accent} />
    </View>
  );
}
