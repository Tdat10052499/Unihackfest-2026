import React from 'react';
import { Tabs } from 'expo-router';
import { WalletNav } from '@/components/wallet/WalletNav';

export default function TabLayout() {
  return (
    <Tabs tabBar={() => <WalletNav />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
    </Tabs>
  );
}
