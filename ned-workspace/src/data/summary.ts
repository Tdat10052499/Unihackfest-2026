// Numbers for the wallet panel hero (WebWalletPanel board), from the same contract list as the Overview.
import { useMemo } from 'react';
import { unsettled } from '@ned/core/milestone/rules.ts';
import type { FundAccount, Region } from '@ned/core/milestone/view.ts';
import { useFundAccounts, useUsdcUnits } from './queries.ts';

export interface WalletSummary {
  usdcUnits: bigint | undefined;
  /** Still locked in funded contracts where this wallet is the freelancer */
  lockedForMe: bigint;
  /** Still locked in funded contracts where this wallet is the client */
  lockedByMe: bigint;
  /** Released to this wallet as freelancer, all time (the chain keeps no release date; see W1 notes) */
  releasedToMe: bigint;
  lockedForMeContracts: number;
  activeContracts: number;
  loading: boolean;
}

const isMine = (key: { toBase58(): string }, wallet: string) => key.toBase58() === wallet;

export function summarise(funds: FundAccount[], wallet: string) {
  let lockedForMe = 0n;
  let lockedByMe = 0n;
  let releasedToMe = 0n;
  let lockedForMeContracts = 0;
  let activeContracts = 0;
  for (const f of funds) {
    if (f.state !== 'Settled') activeContracts += 1;
    const open = f.state === 'Funded' ? unsettled(f) : 0n;
    if (isMine(f.freelancer, wallet)) {
      lockedForMe += open;
      if (open > 0n) lockedForMeContracts += 1;
      releasedToMe += f.released;
    }
    if (isMine(f.client, wallet)) lockedByMe += open;
  }
  return { lockedForMe, lockedByMe, releasedToMe, lockedForMeContracts, activeContracts };
}

export function useWalletSummary(wallet: string | null, region: Region): WalletSummary {
  const funds = useFundAccounts(wallet);
  // The Vietnam view shows what is locked for you in VND, not a USDC balance (WebWalletPanel board)
  const usdc = useUsdcUnits(region === 'intl' ? wallet : null);
  const totals = useMemo(
    () => summarise(funds.data?.funds ?? [], wallet ?? ''),
    [funds.data, wallet]
  );
  return { ...totals, usdcUnits: usdc.data, loading: funds.isLoading || (region === 'intl' && usdc.isLoading) };
}
