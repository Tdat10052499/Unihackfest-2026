// Actions the Contract page runs itself (S7): Release now / Refund now (U4, both parties), Move locked budget
// (lock_from_job, job contracts), Return to client (concede, D27) and the split (propose / accept, D27). Each one shows
// the wallet panel's confirm sheet first (workspace-plan section 3), then runs the core action and refreshes.
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { describeActionError, runFundAction, runLockFromJob } from '@ned/core/actions.ts';
import type { FundAccount } from '@ned/core/milestone/decode.ts';
import { formatUsdc } from '@ned/core/milestone/format.ts';
import { unsettled } from '@ned/core/milestone/rules.ts';
import type { FundView } from '@ned/core/milestone/view.ts';
import { partyName } from '../components/ContractsTable.tsx';
import { useWalletPanel, type ConfirmRequest } from '../components/WalletPanelContext.tsx';
import { useActionEnv } from './actions.ts';

const FEE = { label: 'Network fee', value: '~0.000005 SOL', sub: 'devnet test SOL' };
const NO_FEE = { label: 'N.E.D fee', value: 'None during the pilot' };

export type ContractActionKind = 'releaseNow' | 'refundNow' | 'lockFromJob' | 'concede' | 'proposeSplit' | 'acceptSplit';

/** The confirm sheet of each action (pure, so it can be tested) */
export function confirmFor(kind: ContractActionKind, fund: FundView, raw: FundAccount, index = 0, units = 0n): ConfirmRequest {
  const other = partyName(fund);
  const ms = raw.milestones[index];
  const amount = ms ? formatUsdc(ms.amount) : '';
  const freelancer = fund.role === 'client' ? other : 'you';
  const client = fund.role === 'client' ? 'you' : other;
  const partner = fund.destination?.kind === 'payoutPartner';
  const milestone = { label: 'Milestone', value: `${index + 1}${fund.milestones[index]?.name ? ` · ${fund.milestones[index].name}` : ''}` };
  switch (kind) {
    case 'releaseNow':
      return {
        title: `Release ${amount}`,
        rows: [
          { label: 'Contract', value: fund.title },
          milestone,
          { label: 'To', value: fund.role === 'client' ? other : 'You', sub: partner ? 'Through the payout partner, sent as VND (simulated)' : 'The N.E.D wallet chosen at accept' },
          { label: 'Amount', value: amount, mono: true },
          FEE,
          NO_FEE,
        ],
        note: { tone: 'info', text: 'Review time is over. Anyone can release this milestone; the amount goes to the destination fixed at accept.' },
        confirmLabel: 'Release now',
      };
    case 'refundNow':
      return {
        title: `Refund ${amount}`,
        rows: [{ label: 'Contract', value: fund.title }, milestone, { label: 'To', value: fund.role === 'client' ? 'You (the client)' : other }, { label: 'Amount', value: amount, mono: true }, FEE, NO_FEE],
        note: { tone: 'warning', text: 'The submission deadline passed with nothing submitted. Anyone can refund this milestone to the client.' },
        confirmLabel: 'Refund now',
      };
    case 'lockFromJob':
      return {
        title: 'Move locked budget',
        rows: [{ label: 'Contract', value: fund.title }, { label: 'From', value: 'The job’s vault', sub: 'Locked when the job was posted' }, { label: 'Amount', value: formatUsdc(raw.total), mono: true }, FEE, NO_FEE],
        note: { tone: 'purple', text: 'The budget moves from the job into this contract. Nothing leaves your wallet.' },
        confirmLabel: 'Move budget',
      };
    case 'concede':
      return {
        title: `Return milestone ${index + 1} to ${client}`,
        rows: [{ label: 'Contract', value: fund.title }, milestone, { label: 'Amount', value: amount, mono: true }, FEE, NO_FEE],
        note: { tone: 'warning', text: `This refunds milestone ${index + 1} (${amount}) to ${client}. You can't undo it.` },
        confirmLabel: 'Return to client',
      };
    case 'proposeSplit':
    case 'acceptSplit': {
      const toFreelancer = kind === 'acceptSplit' ? raw.cancelFreelancerAmount : units;
      const left = unsettled(raw) - toFreelancer;
      return {
        title: kind === 'acceptSplit' ? 'Accept split' : 'Propose a split',
        rows: [
          { label: 'Contract', value: fund.title },
          { label: `${freelancer === 'you' ? 'You receive' : `${freelancer} receives`}`, value: formatUsdc(toFreelancer), mono: true },
          { label: `${client === 'you' ? 'You get back' : `${client} gets back`}`, value: formatUsdc(left < 0n ? 0n : left), mono: true },
          FEE,
          NO_FEE,
        ],
        note: { tone: 'warning', text: 'A split settles every milestone that is still open in this contract, not only this one.' },
        confirmLabel: kind === 'acceptSplit' ? 'Accept split' : 'Propose split',
      };
    }
  }
}

export function useContractActions(address: string | undefined, fund: FundView | undefined, raw: FundAccount | null | undefined) {
  const { env, status } = useActionEnv();
  const { confirm } = useWalletPanel();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<ContractActionKind | null>(null);
  const [error, setError] = useState('');
  const run = useCallback(
    async (kind: ContractActionKind, index = 0, units = 0n) => {
      if (!fund || !raw || !address) return;
      setError('');
      if (!(await confirm(confirmFor(kind, fund, raw, index, units)))) return;
      setBusy(kind);
      try {
        if (kind === 'lockFromJob') await runLockFromJob(env, address);
        else if (kind === 'proposeSplit') await runFundAction(env, address, 'proposeSplit', undefined, { units });
        else await runFundAction(env, address, kind, index);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['fund', address] }),
          queryClient.invalidateQueries({ queryKey: ['notes', address] }),
          queryClient.invalidateQueries({ queryKey: ['funds'] }),
          queryClient.invalidateQueries({ queryKey: ['jobForFund', address] }),
          queryClient.invalidateQueries({ queryKey: ['jobs'] }),
        ]);
      } catch (err) {
        setError(describeActionError(err));
      } finally {
        setBusy(null);
      }
    },
    [address, fund, raw, confirm, env, queryClient]
  );
  return { run, busy, status, error };
}
