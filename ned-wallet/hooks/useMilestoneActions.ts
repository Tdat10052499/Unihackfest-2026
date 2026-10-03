// Every Milestone Lock action for the screens (non-ui-plan section 3). The pipeline (fresh fund read → rules.ts
// check → builder → sendAndConfirm) lives in @ned/core actions.ts; this hook adds busy / status / error state and
// refreshes the fund after each action. Errors are English sentences from describeTxError(err, 'contract').
// P1 actions exist only when FEATURES.dispute is on.
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  describeActionError,
  previewAction,
  runAccept,
  runCreate,
  runFundAction,
  runSubmit,
  type ActionEnv,
  type ActionExtra,
} from '@ned/core/actions.ts';
import { FEATURES } from '../constants/features';
import { useAuth } from '../services/auth';
import type { ActionKind, ContractDraft } from '../services/milestone/view';
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

export function useMilestoneActions(address?: string): MilestoneActions {
  const { walletAddress, signTransaction } = useAuth();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string>();
  const busyRef = useRef(false);

  /** Signer, chain clock and status callback for the core pipeline (@ned/core actions.ts) */
  const env = useMemo<ActionEnv>(
    () => ({ signer: { walletAddress, signTransaction }, now: chainNowSeconds, onStatus: (s) => setStatus(s) }),
    [walletAddress, signTransaction]
  );

  /** Runs one core action with busy/status/error state, then refreshes every view of the fund */
  const run = useCallback(async <T,>(action: () => Promise<T>, changed?: string): Promise<T> => {
    if (busyRef.current) throw new Error('Another action is still in progress.');
    busyRef.current = true;
    setBusy(true);
    setError(undefined);
    setStatus('');
    try {
      return await action();
    } catch (err) {
      const message = describeActionError(err);
      setError(message);
      throw new Error(message);
    } finally {
      emitFundChanged(changed);
      busyRef.current = false;
      setBusy(false);
      setStatus('');
    }
  }, []);

  const fundAction = useCallback(
    (kind: ActionKind, index?: number, extra?: ActionExtra) => run(() => runFundAction(env, address, kind, index, extra), address),
    [run, env, address]
  );

  const create = useCallback((draft: ContractDraft) => run(() => runCreate(env, draft)), [run, env]);

  const accept = useCallback(
    (choice: 'ownWallet' | 'payoutPartner') =>
      run(() => runAccept(env, address, choice, useUserStore.getState().username ?? ''), address),
    [run, env, address]
  );

  const submit = useCallback(
    async (index: number, link: string) => {
      if (!link.trim()) throw new Error('Add a link to your delivery first.');
      return run(() => runSubmit(env, address, index, link), address);
    },
    [run, env, address]
  );

  const preview = useCallback((kind: ActionKind, index?: number) => previewAction(env, address, kind, index), [env, address]);

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
