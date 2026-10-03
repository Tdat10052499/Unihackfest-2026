// xStocks is hidden from the demo path (FEATURES.xstocks): every /xstocks route redirects home. The code stays.
import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { FEATURES } from '@/constants/features';

export default function XStocksLayout() {
  if (!FEATURES.xstocks) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
