import '../polyfill';
import React from 'react';
import { Slot } from 'expo-router';
import { PrivyProvider } from '@privy-io/expo';

export default function RootLayout() {
  return (
    <PrivyProvider appId="ned-placeholder-app-id-123">
      <Slot />
    </PrivyProvider>
  );
}