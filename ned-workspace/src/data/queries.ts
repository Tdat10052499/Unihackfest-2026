// Read hooks on top of @ned/core (TanStack Query). The screens use these, never web3.js directly.
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { getConnection } from '@ned/core/config.ts';
import { fetchUsdcUnits } from '@ned/core/chain/balance.ts';
import { fetchReverseRecord, fetchReverseRecords } from '@ned/core/identity/dualPda.ts';
import { listFunds } from '@ned/core/milestone/queries.ts';
import { toFundView, type FundAccount, type FundView, type Region } from '@ned/core/milestone/view.ts';
import { useChainTime } from './useChainTime.ts';

export const POLL_MS = 8_000;

/** @username of a wallet from its ReverseRecord (null when it has no N.E.D profile yet) */
export function useUsername(wallet: string | null) {
  return useQuery({
    queryKey: ['username', wallet],
    enabled: Boolean(wallet),
    staleTime: 60_000,
    queryFn: async () => (await fetchReverseRecord(getConnection(), new PublicKey(wallet!)))?.username ?? null,
  });
}

/** USDC in the wallet's USDC account, in base units */
export function useUsdcUnits(wallet: string | null) {
  return useQuery({
    queryKey: ['usdc', wallet],
    enabled: Boolean(wallet),
    refetchInterval: POLL_MS,
    queryFn: () => fetchUsdcUnits(getConnection(), new PublicKey(wallet!)),
  });
}

/** Contracts where the wallet is client or freelancer (newest first) plus counterparty names */
export function useFundAccounts(wallet: string | null) {
  return useQuery({
    queryKey: ['funds', wallet],
    enabled: Boolean(wallet),
    refetchInterval: POLL_MS,
    queryFn: async () => {
      const [asClient, asFreelancer] = await Promise.all([listFunds(wallet!, 'client'), listFunds(wallet!, 'freelancer')]);
      const byAddress = new Map<string, FundAccount>();
      [...asClient, ...asFreelancer].forEach((f) => byAddress.set(f.address.toBase58(), f));
      const funds = [...byAddress.values()].sort((a, b) => b.createdAt - a.createdAt);
      const others = [...new Set(funds.map((f) => (f.client.toBase58() === wallet ? f.freelancer : f.client).toBase58()))];
      const records = others.length ? await fetchReverseRecords(getConnection(), others.map((w) => new PublicKey(w))) : [];
      const names: Record<string, string> = {};
      others.forEach((w, i) => {
        const username = records[i]?.username;
        if (username) names[w] = `@${username}`;
      });
      return { funds, names };
    },
  });
}

/** FundViews for the screens (labels, tones, next action), recomputed every chain-clock tick */
export function useFunds(wallet: string | null, region: Region): { funds: FundView[]; loading: boolean; error: boolean } {
  const query = useFundAccounts(wallet);
  const now = useChainTime();
  const funds = useMemo(
    () => (wallet && query.data ? query.data.funds.map((f) => toFundView(f, wallet, region, now, { names: query.data.names, p1: false })) : []),
    [wallet, region, now, query.data]
  );
  return { funds, loading: query.isLoading, error: query.isError };
}
