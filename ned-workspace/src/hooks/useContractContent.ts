// Brief and deliveries of one contract, decrypted on this computer (build-plan B1, non-ui-plan 3.1). Notes come from
// the fund's transactions; only a set whose hash equals the on-chain hash is shown. The key comes from this computer, a
// key note wrapped for this computer (key sync, D22) or a pasted contract link. Same logic as the phone app.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getConnection } from '@ned/core/config.ts';
import type { FundAccount } from '@ned/core/milestone/decode.ts';
import { importKeyFromFragment, inviteLink as makeInviteLink, loadContentKey } from '@ned/core/milestone/keys.ts';
import { fetchNotes, readContractContent, type ContentStatus, type ContractContent } from '@ned/core/milestone/notes.ts';
import { contractKeyStorage } from './keyStore.ts';
import { recoverKey, shareKeyOnce } from './keySync.ts';
import { useAuth } from '../auth/AuthProvider.tsx';

/** Changes that can add notes: state, and per milestone status + submission time */
const noteStamp = (f: FundAccount) => `${f.state}|${f.milestones.map((m) => `${m.status}:${m.submittedAt}`).join(',')}`;

export interface ContractContentState {
  content?: ContractContent;
  contentStatus: ContentStatus;
  hasKey: boolean;
  /** The key lookup and the notes read have finished (or failed): render the content states only after this */
  ready: boolean;
  inviteLink?: string;
  /** '#k=…', a bare key or a pasted link of this contract; false when it holds no valid key or is another contract's */
  importKey(input: string): Promise<boolean>;
}

export function useContractContent(fund: FundAccount | null | undefined, wallet: string | null): ContractContentState {
  const client = useQueryClient();
  const address = fund?.address.toBase58();
  const [keyVersion, setKeyVersion] = useState(0);

  const key = useQuery({
    queryKey: ['contract-key', wallet, address, keyVersion],
    enabled: Boolean(wallet && address),
    staleTime: Infinity,
    queryFn: async () => (await loadContentKey(contractKeyStorage, wallet!, address!)) ?? null,
  });
  // Notes only change with the fund, so the query key carries the fund's stamp
  const notes = useQuery({
    queryKey: ['notes', address, fund ? noteStamp(fund) : ''],
    enabled: Boolean(fund),
    staleTime: Infinity,
    queryFn: () => fetchNotes(fund!.address, getConnection()),
  });

  // Key sync (D22): no K on this computer → take it from a key note wrapped for this computer's device key
  const recovered = useQuery({
    queryKey: ['recovered-key', wallet, address, fund ? noteStamp(fund) : '', keyVersion],
    enabled: Boolean(wallet && fund && notes.data && key.data === null),
    staleTime: Infinity,
    queryFn: () => recoverKey(wallet!, fund!, notes.data!),
  });
  const contentKey = key.data ?? recovered.data ?? (key.data === null && recovered.isFetched ? null : undefined);

  // This computer has K: give it to the parties' other registered devices too (silent, once per session)
  const { signTransaction } = useAuth();
  const party = Boolean(fund && wallet && (fund.client.toBase58() === wallet || fund.freelancer.toBase58() === wallet));
  useEffect(() => {
    if (contentKey && party && address) void shareKeyOnce({ walletAddress: wallet, signTransaction }, address);
  }, [contentKey, party, address, wallet, signTransaction]);

  const content = useMemo(
    () => (fund && notes.data && contentKey !== undefined ? readContractContent(fund, notes.data, contentKey) : undefined),
    [fund, notes.data, contentKey]
  );

  const importKey = useCallback(
    async (input: string) => {
      if (!wallet || !address) return false;
      const ok = await importKeyFromFragment(contractKeyStorage, wallet, address, input);
      if (ok) {
        setKeyVersion((v) => v + 1);
        await client.invalidateQueries({ queryKey: ['notes', address] });
      }
      return ok;
    },
    [wallet, address, client]
  );

  return {
    ...(content ? { content } : {}),
    contentStatus: content?.contentStatus ?? 'loading',
    hasKey: Boolean(contentKey),
    ready: key.isFetched && (notes.isFetched || notes.isError) && (key.data !== null || recovered.isFetched || !notes.data),
    ...(contentKey && address ? { inviteLink: makeInviteLink(address, contentKey) } : {}),
    importKey,
  };
}
