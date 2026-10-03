// Contract lists for the signed-in wallet, as FundViews. Polls every 8 s while mounted.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../services/auth';
import { displayNamesFor } from '../services/identity/resolve';
import { listFunds } from '../services/milestone/queries';
import { toFundView, type FundAccount, type FundView, type Role } from '../services/milestone/view';
import { onFundChanged } from './milestoneRefresh';
import { useChainTime } from './useChainTime';
import { useRegion } from './useRegion';

export const POLL_MS = 8_000;
const LOAD_ERROR = 'Could not load your contracts. Check your connection and try again.';

/** wallet → "@username" or a short address, for the other party of each contract */
export async function counterpartyNames(funds: FundAccount[], me: string): Promise<Record<string, string>> {
  const wallets = funds.map((f) => (f.client.toBase58() === me ? f.freelancer : f.client).toBase58());
  if (wallets.length === 0) return {};
  try {
    return await displayNamesFor(wallets);
  } catch {
    return {};
  }
}

export function useFunds(role?: Role): {
  funds: FundView[];
  /** Decoded accounts, same order (B3: Home sums amounts from them) */
  raw: FundAccount[];
  loading: boolean;
  error?: string;
  refresh(): Promise<void>;
} {
  const { walletAddress } = useAuth();
  const { region } = useRegion();
  const now = useChainTime();
  const [raw, setRaw] = useState<FundAccount[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!walletAddress) {
      setRaw([]);
      setLoading(false);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const roles: Role[] = role ? [role] : ['client', 'freelancer'];
      const lists = await Promise.all(roles.map((r) => listFunds(walletAddress, r)));
      const byAddress = new Map<string, FundAccount>();
      lists.flat().forEach((f) => byAddress.set(f.address.toBase58(), f));
      const funds = [...byAddress.values()].sort((a, b) => b.createdAt - a.createdAt);
      setRaw(funds);
      setError(undefined);
      setNames(await counterpartyNames(funds, walletAddress));
    } catch (err) {
      console.warn('[useFunds] refresh failed', err);
      setError(LOAD_ERROR);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [walletAddress, role]);

  useEffect(() => {
    // First load on the next tick (not synchronously inside the effect), then every POLL_MS
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), POLL_MS);
    const off = onFundChanged(() => void refresh());
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      off();
    };
  }, [refresh]);

  const funds = useMemo(
    () => (walletAddress ? raw.map((f) => toFundView(f, walletAddress, region ?? 'vn', now, { names })) : []),
    [raw, walletAddress, region, now, names]
  );
  return { funds, raw, loading, ...(error ? { error } : {}), refresh };
}
