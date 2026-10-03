// One contract as a FundView (with names and, when given, the decrypted content), polled like the lists.
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { getConnection } from '@ned/core/config.ts';
import { fetchReverseRecords } from '@ned/core/identity/dualPda.ts';
import { getFund } from '@ned/core/milestone/queries.ts';
import { toFundView, type FundView, type Region } from '@ned/core/milestone/view.ts';
import type { ContractContent } from '@ned/core/milestone/notes.ts';
import { POLL_MS } from './queries.ts';
import { useChainTime } from './useChainTime.ts';

export const isFundAddress = (value: string | undefined): value is string => {
  if (!value) return false;
  try {
    return new PublicKey(value).toBase58() === value;
  } catch {
    return false;
  }
};

export function useFundAccount(address: string | undefined) {
  return useQuery({
    queryKey: ['fund', address],
    enabled: isFundAddress(address),
    refetchInterval: POLL_MS,
    queryFn: async () => {
      const fund = await getFund(address!, getConnection());
      if (!fund) return { fund: null, names: {} as Record<string, string> };
      const parties = [fund.client, fund.freelancer];
      const records = await fetchReverseRecords(getConnection(), parties);
      const names: Record<string, string> = {};
      parties.forEach((p, i) => {
        const u = records[i]?.username;
        if (u) names[p.toBase58()] = `@${u}`;
      });
      return { fund, names };
    },
  });
}

export function useFund(
  address: string | undefined,
  wallet: string | null,
  region: Region,
  content?: { content?: ContractContent; inviteLink?: string }
): { fund?: FundView; raw?: ReturnType<typeof useFundAccount>['data']; loading: boolean; missing: boolean; error: boolean } {
  const q = useFundAccount(address);
  const now = useChainTime();
  const fund = useMemo(() => {
    const data = q.data;
    if (!data?.fund || !wallet) return undefined;
    return toFundView(data.fund, wallet, region, now, {
      names: data.names,
      p1: false,
      ...(content?.content ? { content: content.content } : {}),
      ...(content?.inviteLink ? { inviteLink: content.inviteLink } : {}),
    });
  }, [q.data, wallet, region, now, content?.content, content?.inviteLink]);
  return { ...(fund ? { fund } : {}), raw: q.data, loading: q.isLoading, missing: q.isSuccess && !q.data?.fund, error: q.isError };
}
