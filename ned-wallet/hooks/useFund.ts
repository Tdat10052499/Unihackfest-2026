// One contract (deep link app/contracts/[fund]), as a FundView plus the decoded account. Polls every 8 s.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../services/auth';
import { getFund } from '../services/milestone/queries';
import { toFundView, type FundAccount, type FundView } from '../services/milestone/view';
import { onFundChanged } from './milestoneRefresh';
import { useChainTime } from './useChainTime';
import { counterpartyNames, POLL_MS } from './useFunds';
import { useRegion } from './useRegion';

export function useFund(address: string): { fund?: FundView; raw?: FundAccount; loading: boolean; refresh(): Promise<void> } {
  const { walletAddress } = useAuth();
  const { region } = useRegion();
  const now = useChainTime();
  const [raw, setRaw] = useState<FundAccount>();
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const fund = await getFund(address);
      setRaw(fund ?? undefined);
      if (fund && walletAddress) setNames(await counterpartyNames([fund], walletAddress));
    } catch (err) {
      // An invalid address or an RPC error: keep the last good value
      console.warn('[useFund] refresh failed', err);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [address, walletAddress]);

  useEffect(() => {
    // First load on the next tick (not synchronously inside the effect), then every POLL_MS
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), POLL_MS);
    const off = onFundChanged((changed) => {
      if (!changed || changed === address) void refresh();
    });
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      off();
    };
  }, [refresh, address]);

  const fund = useMemo(
    () => (raw && walletAddress ? toFundView(raw, walletAddress, region ?? 'vn', now, { names }) : undefined),
    [raw, walletAddress, region, now, names]
  );
  return { ...(fund ? { fund } : {}), ...(raw ? { raw } : {}), loading, refresh };
}
