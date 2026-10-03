// Brief and deliveries of one contract, decrypted on this device (build-plan B1, non-ui-plan 3.1). Notes are read
// from the fund's transactions; only a set whose hash equals the on-chain hash is shown. The contract key K comes
// from this device's key store or from an imported invite link; it is never logged or shown in an error.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useAuth } from '../services/auth';
import type { Brief, DeliveryDraft } from '../services/milestone/content';
import { importKeyFromFragment, inviteLink as makeInviteLink, loadContentKey } from '../services/milestone/keys';
import { contractKeyStorage } from '../services/milestone/keyStore';
import { fetchNotes, readContractContent, type ContentStatus, type ContractContent } from '../services/milestone/notes';
import { getFund } from '../services/milestone/queries';
import type { FundAccount } from '../services/milestone/view';
import { onFundChanged } from './milestoneRefresh';
import { POLL_MS } from './useFunds';

export interface ContractContentState {
  brief?: Brief;
  contentStatus: ContentStatus;
  deliveries: Record<number, { content?: DeliveryDraft; matches: boolean }>;
  hasKey: boolean;
  inviteLink?: string;
  /** Accepts '#k=…', a bare key or a pasted contract link of this contract; false if it holds no valid key */
  importKey(fragmentOrLink: string): Promise<boolean>;
  refresh(): Promise<void>;
}

/** What the screen showed, per wallet + fund: accept() sends the hash of this brief, never the fund's own value */
const shown = new Map<string, ContractContent>();
const shownKey = (wallet: string, fund: string) => `${wallet}:${fund}`;
export function shownContent(wallet: string | null | undefined, fund: string | undefined): ContractContent | undefined {
  return wallet && fund ? shown.get(shownKey(wallet, fund)) : undefined;
}

const isAddress = (value: string) => {
  try {
    return new PublicKey(value).toBase58() === value;
  } catch {
    return false;
  }
};

/** Changes that can add notes: state, and per milestone status + submission time */
const noteStamp = (f: FundAccount) => `${f.state}|${f.milestones.map((m) => `${m.status}:${m.submittedAt}`).join(',')}`;

export function useContractContent(address: string): ContractContentState {
  const { walletAddress } = useAuth();
  const [content, setContent] = useState<ContractContent>();
  const [key, setKey] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState(true);
  const last = useRef<{ stamp: string; key: Uint8Array | null; records: Awaited<ReturnType<typeof fetchNotes>> } | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(
    async (force = false) => {
      if (!walletAddress || !isAddress(address)) {
        setContent(undefined);
        setLoading(false);
        return;
      }
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const [fund, k] = await Promise.all([getFund(address), loadContentKey(contractKeyStorage, walletAddress, address)]);
        setKey(k);
        if (!fund) {
          setContent(undefined);
          return;
        }
        // Notes only change with the fund; re-read them only then (or on a forced refresh)
        const stamp = noteStamp(fund);
        const records = !force && last.current?.stamp === stamp ? last.current.records : await fetchNotes(fund.address);
        last.current = { stamp, key: k, records };
        const next = readContractContent(fund, records, k);
        shown.set(shownKey(walletAddress, address), next);
        setContent(next);
      } catch (err) {
        // RPC error: keep the last good value; never log the key
        console.warn('[useContractContent] refresh failed', err instanceof Error ? err.message : err);
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [address, walletAddress]
  );

  useEffect(() => {
    setLoading(true);
    last.current = null;
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), POLL_MS);
    const off = onFundChanged((changed) => {
      if (!changed || changed === address) void refresh(true);
    });
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      off();
    };
  }, [refresh, address]);

  const importKey = useCallback(
    async (input: string) => {
      if (!walletAddress || !isAddress(address)) return false;
      const ok = await importKeyFromFragment(contractKeyStorage, walletAddress, address, input);
      if (ok) await refresh(true);
      return ok;
    },
    [walletAddress, address, refresh]
  );

  return useMemo(
    () => ({
      ...(content?.brief ? { brief: content.brief } : {}),
      contentStatus: loading && !content ? 'loading' : (content?.contentStatus ?? 'loading'),
      deliveries: content?.deliveries ?? {},
      hasKey: key !== null,
      ...(key ? { inviteLink: makeInviteLink(address, key) } : {}),
      importKey,
      refresh: () => refresh(true),
    }),
    [content, loading, key, address, importKey, refresh]
  );
}
