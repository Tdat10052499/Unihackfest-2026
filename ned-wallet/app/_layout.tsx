import '../polyfill';
import '../services/i18n';
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { PrivyProvider } from '@privy-io/expo';
import { sepolia, mainnet } from 'viem/chains';
import { GlobalPresenceProvider } from '../contexts/GlobalPresenceContext';
import { MwaProvider } from '../contexts/MwaProvider';
import { WalletProvider } from '../src/providers/WalletProvider';

const solanaDevnet = {
  id: 103,
  name: 'Solana Devnet',
  nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
  rpcUrls: {
    default: { http: ['https://api.devnet.solana.com'] },
  },
} as const;

// Hằng số toàn cục cố định reference chống re-render của PrivyProvider
const PRIVY_APP_ID = process.env.EXPO_PUBLIC_PRIVY_APP_ID || 'cmtd0fy9n00x20bjsrwz1bxh9';
const PRIVY_CLIENT_ID = process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID || 'client-WY6d4xXJ5k11vtbhmk6hTvrToEBHd8ogAfzBa8x6siAUR';
const PRIVY_SUPPORTED_CHAINS = [sepolia, mainnet, solanaDevnet as any] as const;

const PRIVY_CONFIG = {
  embedded: {
    solana: {
      createOnLogin: 'users-without-wallets' as const,
    },
    ethereum: {
      createOnLogin: 'off' as const,
    },
  },
};

export default function RootLayout() {
  useEffect(() => {
    console.log("🚀 [Phase 1] Privy App ID:", process.env.EXPO_PUBLIC_PRIVY_APP_ID);
    console.log("🚀 [Phase 1] Privy Client ID:", process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID);
  }, []);

  return (
    <SafeAreaProvider style={styles.root}>
      <View style={styles.root}>
        <PrivyProvider
          appId={process.env.EXPO_PUBLIC_PRIVY_APP_ID || PRIVY_APP_ID}
          clientId={process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID || PRIVY_CLIENT_ID}
          supportedChains={PRIVY_SUPPORTED_CHAINS as any}
          config={PRIVY_CONFIG}
        >
          <MwaProvider>
            <WalletProvider
              defaultCluster={
                process.env.EXPO_PUBLIC_SOLANA_CLUSTER === 'mainnet-beta' ||
                process.env.EXPO_PUBLIC_SOLANA_CLUSTER === 'mainnet'
                  ? 'mainnet-beta'
                  : 'devnet'
              }
            >
              <GlobalPresenceProvider>
                <View style={styles.root}>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="history" options={{ headerShown: false }} />
                    <Stack.Screen name="settings" options={{ headerShown: false }} />
                    <Stack.Screen name="login" options={{ headerShown: false }} />
                    <Stack.Screen name="shake-room" options={{ headerShown: false }} />
                    <Stack.Screen name="send" options={{ headerShown: false }} />
                    <Stack.Screen name="coin-toss-room" options={{ headerShown: false }} />
                    <Stack.Screen name="onConnect" options={{ headerShown: false }} />
                    <Stack.Screen name="onSignMessage" options={{ headerShown: false }} />
                    <Stack.Screen name="onSignTransaction" options={{ headerShown: false }} />
                    <Stack.Screen name="+not-found" options={{ headerShown: false }} />
                  </Stack>
                </View>
              </GlobalPresenceProvider>
            </WalletProvider>
          </MwaProvider>
        </PrivyProvider>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});