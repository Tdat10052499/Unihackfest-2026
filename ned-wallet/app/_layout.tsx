import '../polyfill';
import '../services/i18n';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { PrivyProvider } from '@privy-io/expo';
import { GlobalPresenceProvider } from '../contexts/GlobalPresenceContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider style={styles.root}>
      <View style={styles.root}>
        <PrivyProvider
          appId="cmtd0fy9n00x20bjsrwz1bxh9"
          clientId="client-WY6d4xXJ5k11vtbhmk6hTvrToEBHd8ogAfzBa8x6siAUR"
          config={{
            embedded: {
              solana: {
                createOnLogin: 'users-without-wallets',
              },
              ethereum: {
                createOnLogin: 'off',
              },
            },
          }}
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
              </Stack>
            </View>
          </GlobalPresenceProvider>
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