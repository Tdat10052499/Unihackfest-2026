// One milestone of one contract for the submit and review pages (W4): /contract/:fund/<page>?i=<milestone index>.
// Fund (polled), decrypted content, the money view and chain time, plus refresh() after an action.
import { useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider.tsx';
import { useRegion } from './region.ts';
import { useChainTime } from './useChainTime.ts';
import { useContractContent } from './useContractContent.ts';
import { isFundAddress, useFund } from './useFund.ts';

export function useMilestonePage() {
  const { fund: address } = useParams();
  const [params] = useSearchParams();
  const index = Math.max(0, Math.floor(Number(params.get('i') ?? 0)) || 0);
  const { walletAddress } = useAuth();
  const { region } = useRegion(walletAddress);
  const now = useChainTime();
  const base = useFund(address, walletAddress, region);
  const raw = base.raw?.fund ?? null;
  const content = useContractContent(raw, walletAddress);
  const { fund } = useFund(address, walletAddress, region, {
    ...(content.content ? { content: content.content } : {}),
    ...(content.inviteLink ? { inviteLink: content.inviteLink } : {}),
  });
  const client = useQueryClient();
  const refresh = useCallback(async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['fund', address] }),
      client.invalidateQueries({ queryKey: ['notes', address] }),
      client.invalidateQueries({ queryKey: ['funds'] }),
    ]);
  }, [client, address]);
  return {
    address: isFundAddress(address) ? address : undefined,
    index,
    wallet: walletAddress,
    vn: region === 'vn',
    now,
    raw,
    fund,
    ms: fund?.milestones[index],
    msRaw: raw?.milestones[index],
    content,
    missing: !isFundAddress(address) || base.missing,
    error: base.error,
    refresh,
  };
}
