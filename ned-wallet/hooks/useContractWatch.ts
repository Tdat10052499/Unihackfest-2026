// Contract notifications (build-plan B5): compares each read of the wallet's contracts with the last one seen on this
// device (`@ned_contract_seen_v1:<wallet>`) and posts what the other party did through useNotificationStore
// (addNotification also raises the banner). Text uses chain data only: never brief text, milestone names or a key.
// A release also brings the Records cache up to date.
import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../services/auth';
import { displayNamesFor } from '../services/identity/resolve';
import { contractEvents, contractSnapshot, type ContractSnapshot } from '../services/milestone/events';
import { formatUsdc } from '../services/milestone/format';
import { contractNotice } from '../services/milestone/notices';
import { refreshRecords } from '../services/milestone/recordsStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import { useFunds } from './useFunds';
import { useRegion } from './useRegion';

const SEEN_PREFIX = '@ned_contract_seen_v1:';
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

export function useContractWatch(): void {
  const { walletAddress } = useAuth();
  const { raw, loading, error } = useFunds();
  const { region } = useRegion();
  const seen = useRef<{ wallet: string; snapshot: ContractSnapshot | null } | null>(null);

  useEffect(() => {
    if (!walletAddress || loading || error) return;
    let live = true;
    (async () => {
      const key = SEEN_PREFIX + walletAddress;
      if (seen.current?.wallet !== walletAddress) {
        const saved = await AsyncStorage.getItem(key).catch(() => null);
        let snapshot: ContractSnapshot | null = null;
        try {
          snapshot = saved ? (JSON.parse(saved) as ContractSnapshot) : null;
        } catch {
          snapshot = null;
        }
        seen.current = { wallet: walletAddress, snapshot };
      }
      const events = contractEvents(seen.current.snapshot, raw, walletAddress);
      const snapshot = contractSnapshot(raw);
      seen.current = { wallet: walletAddress, snapshot };
      await AsyncStorage.setItem(key, JSON.stringify(snapshot)).catch(() => undefined);
      if (!live || !events.length) return;

      const names = await displayNamesFor([...new Set(events.map((e) => e.counterparty))]).catch(() => ({}) as Record<string, string>);
      const vn = (region ?? 'vn') === 'vn';
      const { addNotification } = useNotificationStore.getState();
      for (const e of events) {
        const name = names[e.counterparty] ?? short(e.counterparty);
        await addNotification({
          id: e.id,
          type: 'CONTRACT',
          ...contractNotice(e, vn, name),
          route: `/contracts/${e.fund}`,
          ...(vn ? {} : { amount: formatUsdc(e.amountUnits), currency: 'USDC' }),
        });
      }
      if (events.some((e) => e.kind === 'released'))
        void refreshRecords(walletAddress, raw.filter((f) => f.freelancer.toBase58() === walletAddress)).catch(() => undefined);
    })();
    return () => {
      live = false;
    };
  }, [walletAddress, raw, loading, error, region]);
}
