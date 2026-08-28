import '../polyfill';
import React from 'react';
import { Slot } from 'expo-router';
import { PrivyProvider } from '@privy-io/expo';

export default function RootLayout() {
  return (
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
      <Slot />
    </PrivyProvider>
  );
}