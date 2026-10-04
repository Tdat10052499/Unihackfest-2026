// Key sync (D22): registers this computer's device key for the signed-in wallet, once per session, silently.
import { useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider.tsx';
import { ensureDeviceRegistered } from '../hooks/keySync.ts';

export function DeviceKeyGate() {
  const { status, walletAddress, signTransaction } = useAuth();
  useEffect(() => {
    if (status !== 'ready' || !walletAddress) return;
    void ensureDeviceRegistered({ walletAddress, signTransaction });
  }, [status, walletAddress, signTransaction]);
  return null;
}
