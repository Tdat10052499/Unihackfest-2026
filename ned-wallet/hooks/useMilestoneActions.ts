// Every Milestone Lock action for the screens (non-ui-plan section 3). Each action: fresh fund read →
// rules.ts check → builder → sendAndConfirm → refresh. Errors are English sentences from
// describeTxError(err, 'contract'). P1 actions exist only when FEATURES.dispute is on.
import { useCallback, useMemo, useRef, useState } from 'react';
import { PublicKey, type Transaction } from '@solana/web3.js';
import { FEATURES } from '../constants/features';
import { useAuth } from '../services/auth';
import { connection } from '../services/chain/connection';
import { fetchUsdcUnits } from '../services/chain/balance';
import { describeTxError, UserFacingError } from '../services/chain/errors';
import { sendAndConfirm, type SendStatus } from '../services/chain/send';
import { prepareTransactionCost } from '../services/identity/transactionCost';
import * as client from '../services/milestone/client';
import { shortHash } from '../services/milestone/evidence';
import { formatUsdc, unitsFromUsdc } from '../services/milestone/format';
import { getFund } from '../services/milestone/queries';
import * as rules from '../services/milestone/rules';
import type { ActionKind, ContractDraft, FundAccount } from '../services/milestone/view';
import { useUserStore } from '../stores/useUserStore';
import { emitFundChanged } from './milestoneRefresh';
import { chainNowSeconds } from './useChainTime';

type Sig = Promise<{ signature: string }>;

export interface MilestoneActions {
  create(draft: ContractDraft): Promise<{ signature: string; fund: string }>;
  accept(choice: 'ownWallet' | 'payoutPartner'): Sig;
  lock(): Sig;
  submit(index: number, link: string): Promise<{ signature: string; evidence: string }>;
  approve(index: number): Sig;
  releaseNow(index: number): Sig;
  refundNow(index: number): Sig;
  close(): Sig;
  // P1, present only when FEATURES.dispute
  dispute?(index: number): Sig;
  concede?(index: number): Sig;
  proposeSplit?(toFreelancerUnits: bigint): Sig;
  acceptSplit?(): Sig;
  busy: boolean;
  /** "Confirm in your wallet…", "Waiting for confirmation…" */
  status: string;
  error?: string;
  /** Network fee and account rent of an action, for FeeBreakdown */
  preview(kind: ActionKind, index?: number): Promise<{ feeLamports: number; rentLamports: number }>;
}

const NOT_NOW = 'This action is not available right now. Refresh the contract and try again.';

export function useMilestoneActions(address?: string): MilestoneActions {
  const { walletAddress, signTransaction } = useAuth();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string>();
  const busyRef = useRef(false);

  /** Builds the transaction for `kind` after the same checks the program makes */
  const build = useCallback(
    async (kind: ActionKind, me: PublicKey, fund: FundAccount, now: number, index = 0, extra?: { link?: string; units?: bigint }) => {
      const check = (ok: boolean) => {
        if (!ok) throw new UserFacingError(NOT_NOW);
      };
      switch (kind) {
        case 'accept':
          // Same fee and rent for both choices; the own-wallet variant needs no username
          check(rules.canAccept(fund, me, now));
          return client.buildAccept({ fund, freelancer: me, choice: 'ownWallet', username: '' });
        case 'lock': {
          check(rules.canLock(fund, me, now));
          // The Token program would fail with a bare 0x1; say what is missing instead
          const balance = await fetchUsdcUnits(connection, me);
          if (balance < fund.total) {
            throw new UserFacingError(`You need ${formatUsdc(fund.total)} to lock this contract; your wallet has ${formatUsdc(balance)}.`);
          }
          return client.buildLock({ fund, client: me });
        }
        case 'submit':
          check(rules.canSubmit(fund, me, index, now));
          return client.buildSubmit({ fund, freelancer: me, index, link: extra?.link ?? '' });
        case 'approve':
          check(rules.canApprove(fund, me, index));
          return client.buildApprove({ fund, client: me, index });
        case 'releaseNow':
          check(rules.canReleaseAfterReview(fund, index, now));
          return client.buildReleaseAfterReview({ fund, caller: me, index });
        case 'refundNow':
          check(rules.canRefund(fund, index, now));
          return client.buildRefund({ fund, caller: me, index });
        case 'close':
          check(rules.canClose(fund, me));
          return client.buildClose({ fund, creator: me });
        case 'dispute':
          check(rules.canDispute(fund, me, index, now));
          return client.buildDispute({ fund, client: me, index });
        case 'concede':
          check(rules.canConcede(fund, me, index));
          return client.buildConcede({ fund, freelancer: me, index });
        case 'proposeSplit': {
          const units = extra?.units ?? 0n;
          if (!rules.canProposeSplit(fund, me)) throw new UserFacingError(NOT_NOW);
          if (!rules.canProposeSplit(fund, me, units)) throw new UserFacingError('The proposed amount is larger than what is still locked.');
          return client.buildProposeSplit({ fund, signer: me, toFreelancerUnits: units });
        }
        case 'acceptSplit':
          check(rules.canAcceptSplit(fund, me));
          return client.buildAcceptSplit({ fund, signer: me });
      }
    },
    []
  );

  /** Runs one action end to end; sets busy/status/error and refreshes the fund */
  const run = useCallback(
    async <T>(work: (me: PublicKey) => Promise<{ tx: Transaction; rent: number } & T>, changed?: string): Promise<{ signature: string } & T> => {
      if (busyRef.current) throw new Error('Another action is still in progress.');
      busyRef.current = true;
      setBusy(true);
      setError(undefined);
      setStatus('');
      try {
        if (!walletAddress) throw new UserFacingError('Sign in first.');
        const built = await work(new PublicKey(walletAddress));
        const { signature } = await sendAndConfirm(built.tx, { walletAddress, signTransaction }, {
          rent: built.rent,
          onStatus: (s: SendStatus) => setStatus(s),
        });
        const { tx: _tx, rent: _rent, ...rest } = built;
        return { ...(rest as T), signature };
      } catch (err) {
        const message = describeTxError(err, 'contract');
        setError(message);
        throw new Error(message);
      } finally {
        emitFundChanged(changed);
        busyRef.current = false;
        setBusy(false);
        setStatus('');
      }
    },
    [walletAddress, signTransaction]
  );

  /** Fresh read of this contract (never act on a stale poll result) */
  const freshFund = useCallback(async () => {
    if (!address) throw new UserFacingError('Open a contract first.');
    const fund = await getFund(address);
    if (!fund) throw new UserFacingError('This contract no longer exists.');
    return fund;
  }, [address]);

  const fundAction = useCallback(
    (kind: ActionKind, index?: number, extra?: { link?: string; units?: bigint }) =>
      run(async (me) => build(kind, me, await freshFund(), await chainNowSeconds(), index, extra), address),
    [run, build, freshFund, address]
  );

  const create = useCallback(
    async (draft: ContractDraft) => {
      const result = await run(async (me) => {
        const check = rules.validateDraft(draft, await chainNowSeconds(), me);
        if (!check.ok) throw new UserFacingError(check.errors[0].message);
        return client.buildCreateFund({
          client: me,
          freelancer: new PublicKey(draft.freelancer),
          title: draft.title,
          milestones: draft.milestones.map((m) => ({
            amount: unitsFromUsdc(m.amountUsdc) ?? 0n,
            submitBy: m.submitBy,
            reviewBy: m.submitBy + m.reviewSeconds,
          })),
        });
      });
      return { signature: result.signature, fund: result.fund.toBase58() };
    },
    [run]
  );

  const accept = useCallback(
    (choice: 'ownWallet' | 'payoutPartner') =>
      run(async (me) => {
        const fund = await freshFund();
        if (!rules.canAccept(fund, me, await chainNowSeconds())) throw new UserFacingError(NOT_NOW);
        // The payout-partner reference is built from the username (demo-<username>-001)
        const username = useUserStore.getState().username ?? '';
        if (choice === 'payoutPartner' && !username) {
          throw new UserFacingError('Create your N.E.D profile before choosing a VND payout.');
        }
        return client.buildAccept({ fund, freelancer: me, choice, username });
      }, address),
    [run, freshFund, address]
  );

  const submit = useCallback(
    async (index: number, link: string) => {
      if (!link.trim()) throw new Error('Add a link to your delivery first.');
      const result = await fundAction('submit', index, { link });
      return { signature: result.signature, evidence: shortHash((result as unknown as { evidence: Uint8Array }).evidence) };
    },
    [fundAction]
  );

  const preview = useCallback(
    async (kind: ActionKind, index?: number) => {
      if (!walletAddress) throw new UserFacingError('Sign in first.');
      const me = new PublicKey(walletAddress);
      const built = await build(kind, me, await freshFund(), await chainNowSeconds(), index, { link: 'preview' });
      const cost = await prepareTransactionCost(connection, built.tx, walletAddress, built.rent);
      return { feeLamports: cost.fee, rentLamports: cost.rent };
    },
    [walletAddress, build, freshFund]
  );

  return useMemo(() => {
    const base: MilestoneActions = {
      create,
      accept,
      lock: () => fundAction('lock'),
      submit,
      approve: (i) => fundAction('approve', i),
      releaseNow: (i) => fundAction('releaseNow', i),
      refundNow: (i) => fundAction('refundNow', i),
      close: () => fundAction('close'),
      busy,
      status,
      ...(error ? { error } : {}),
      preview,
    };
    if (!FEATURES.dispute) return base;
    return {
      ...base,
      dispute: (i: number) => fundAction('dispute', i),
      concede: (i: number) => fundAction('concede', i),
      proposeSplit: (units: bigint) => fundAction('proposeSplit', undefined, { units }),
      acceptSplit: () => fundAction('acceptSplit'),
    };
  }, [create, accept, fundAction, submit, busy, status, error, preview]);
}
