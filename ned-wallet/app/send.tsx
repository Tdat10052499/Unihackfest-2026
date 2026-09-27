import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SendFlow } from '../components/SendFlow';
import { useAuth } from '../services/auth';
import { useOnchainTransfer } from '../hooks/useOnchainTransfer';

export default function SendScreen() {
  const router = useRouter();
  const { recipient } = useLocalSearchParams<{ recipient?: string }>();
  const { walletAddress } = useAuth();
  const { transfer } = useOnchainTransfer();
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#080812' }}>
    <SendFlow key={recipient ?? ''} wallet={walletAddress} initialRecipient={recipient} onClose={() => router.back()} onScan={() => router.push('/scan-qr')} onSend={async (wallet, amount) => {
      const result = await transfer({ recipientAddressOrPhone: wallet, amountUsd: amount });
      if (!result.success) throw new Error(result.error || 'Transfer failed.');
      return result.transactionHash;
    }} />
  </SafeAreaView>;
}
