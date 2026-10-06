// Pure copies of the ned_program checks (program-spec 3.4 and 4). Rule: when a check changes, change the
// Rust handler, this file and both tests in the same PR. "A deadline has passed" means now > deadline.
import { PublicKey } from '@solana/web3.js';
import type { FundAccount, MilestoneAccount } from './decode.ts';
import {
  isTerminal,
  MAX_CONTRACT_AMOUNT,
  MAX_MILESTONES,
  MIN_REVIEW_WINDOW_SECS,
  MIN_WORK_WINDOW_SECS,
  TITLE_MAX_LEN,
} from './layout.ts';
import { unitsFromUsdc } from './format.ts';

type Wallet = PublicKey | string;
const is = (a: PublicKey, b: Wallet) => a.toBase58() === (typeof b === 'string' ? b : b.toBase58());
const at = (fund: FundAccount, index: number): MilestoneAccount | undefined =>
  Number.isInteger(index) && index >= 0 && index < fund.milestoneCount ? fund.milestones[index] : undefined;

/** Sum of the amounts of milestones that are not terminal */
export function unsettled(fund: FundAccount): bigint {
  return fund.milestones.filter((m) => !isTerminal(m.status)).reduce((sum, m) => sum + m.amount, 0n);
}

/** now + MIN_WORK_WINDOW_SECS <= min(submit_by) over the used milestones (create_fund, accept, lock) */
export function workWindowOk(milestones: { submitBy: number }[], now: number): boolean {
  if (milestones.length === 0) return false;
  return now + MIN_WORK_WINDOW_SECS <= Math.min(...milestones.map((m) => m.submitBy));
}

export const canAccept = (fund: FundAccount, me: Wallet, now: number) =>
  fund.state === 'Created' && is(fund.freelancer, me) && workWindowOk(fund.milestones, now);

export const canLock = (fund: FundAccount, me: Wallet, now: number) =>
  fund.state === 'Accepted' && is(fund.client, me) && workWindowOk(fund.milestones, now);

export function canSubmit(fund: FundAccount, me: Wallet, index: number, now: number): boolean {
  const m = at(fund, index);
  return !!m && fund.state === 'Funded' && is(fund.freelancer, me) && m.status === 'Pending' && now <= m.submitBy;
}

export function canApprove(fund: FundAccount, me: Wallet, index: number): boolean {
  const m = at(fund, index);
  return !!m && fund.state === 'Funded' && is(fund.client, me) && (m.status === 'Submitted' || m.status === 'Disputed');
}

/** Anyone may call it */
export function canReleaseAfterReview(fund: FundAccount, index: number, now: number): boolean {
  const m = at(fund, index);
  return !!m && fund.state === 'Funded' && m.status === 'Submitted' && now > m.reviewBy;
}

/** Anyone may call it */
export function canRefund(fund: FundAccount, index: number, now: number): boolean {
  const m = at(fund, index);
  return !!m && fund.state === 'Funded' && m.status === 'Pending' && now > m.submitBy;
}

export const canClose = (fund: FundAccount, me: Wallet) =>
  is(fund.creator, me) && (fund.state === 'Created' || fund.state === 'Accepted' || fund.state === 'Settled');

// ---- P1 (shipped behind FEATURES.dispute) ----

export function canDispute(fund: FundAccount, me: Wallet, index: number, now: number): boolean {
  const m = at(fund, index);
  return !!m && fund.state === 'Funded' && is(fund.client, me) && m.status === 'Submitted' && now <= m.reviewBy;
}

export function canConcede(fund: FundAccount, me: Wallet, index: number): boolean {
  const m = at(fund, index);
  return !!m && fund.state === 'Funded' && is(fund.freelancer, me) && m.status === 'Disputed';
}

// ---- D27 (review-decision-plan.md): notes the program v1.3 post_note accepts ----

/** Client: Submitted before review_by (dispute + review note), or Disputed (another review note on a revised version) */
export function canRequestChanges(fund: FundAccount, me: Wallet, index: number, now: number): boolean {
  const m = at(fund, index);
  return !!m && fund.state === 'Funded' && is(fund.client, me) && ((m.status === 'Submitted' && now <= m.reviewBy) || m.status === 'Disputed');
}

/** Freelancer: a revised version (delivery note) on a Disputed milestone */
export const canSendRevision = (fund: FundAccount, me: Wallet, index: number) => canConcede(fund, me, index);

/** Freelancer: the final files (delivery note) on a Released milestone; the fund must still exist */
export function canHandover(fund: FundAccount, me: Wallet, index: number): boolean {
  const m = at(fund, index);
  return !!m && is(fund.freelancer, me) && m.status === 'Released';
}

const isParty = (fund: FundAccount, me: Wallet) => is(fund.client, me) || is(fund.freelancer, me);

export const canProposeSplit = (fund: FundAccount, me: Wallet, toFreelancerUnits?: bigint) =>
  fund.state === 'Funded' &&
  isParty(fund, me) &&
  (toFreelancerUnits === undefined || (toFreelancerUnits >= 0n && toFreelancerUnits <= unsettled(fund)));

export const canAcceptSplit = (fund: FundAccount, me: Wallet) =>
  fund.state === 'Funded' &&
  isParty(fund, me) &&
  fund.cancelProposer !== null &&
  !is(fund.cancelProposer, me) &&
  fund.cancelFreelancerAmount <= unsettled(fund);

/** Work window passed before lock: the contract can only be closed */
export const isTooLate = (fund: FundAccount, now: number) =>
  (fund.state === 'Created' || fund.state === 'Accepted') && !workWindowOk(fund.milestones, now);

// ---- create form ----

export interface ContractDraft {
  /** resolved wallet (resolveRecipient with fresh: true) */
  freelancer: string;
  /** ≤ 32 bytes UTF-8 */
  title: string;
  milestones: { amountUsdc: string; submitBy: number; reviewSeconds: number }[];
}

export interface DraftCheck {
  ok: boolean;
  errors: { field: string; message: string }[];
}

/** The create_fund checks, as form errors. `client` (the signed-in wallet) enables the same-party check. */
export function validateDraft(draft: ContractDraft, now: number, client?: Wallet): DraftCheck {
  const errors: DraftCheck['errors'] = [];
  const add = (field: string, message: string) => errors.push({ field, message });

  let freelancer: PublicKey | null = null;
  try {
    freelancer = new PublicKey(draft.freelancer);
  } catch {
    add('freelancer', 'Enter the freelancer’s @username or wallet address.');
  }
  if (freelancer?.equals(PublicKey.default)) add('freelancer', 'This freelancer address is not valid.');
  if (freelancer && client && is(freelancer, client)) add('freelancer', 'You cannot create a contract with yourself.');

  if (new TextEncoder().encode(draft.title).length > TITLE_MAX_LEN) add('title', 'The title is longer than 32 bytes.');

  const n = draft.milestones.length;
  if (n < 1 || n > MAX_MILESTONES) add('milestones', 'A contract needs 1 to 5 milestones.');

  let total = 0n;
  draft.milestones.forEach((m, i) => {
    const units = unitsFromUsdc(m.amountUsdc);
    if (units === null || units <= 0n) add(`milestones.${i}.amountUsdc`, 'Enter an amount above 0.');
    else total += units;
    if (!Number.isInteger(m.reviewSeconds) || m.reviewSeconds < MIN_REVIEW_WINDOW_SECS) {
      add(`milestones.${i}.reviewSeconds`, `The review window must be at least ${MIN_REVIEW_WINDOW_SECS} seconds.`);
    }
    if (!Number.isInteger(m.submitBy)) add(`milestones.${i}.submitBy`, 'Choose a submission deadline.');
  });
  if (total > MAX_CONTRACT_AMOUNT) add('total', 'The contract total is above the 1,000 USDC demo limit.');
  if (n > 0 && !workWindowOk(draft.milestones, now)) {
    add('milestones.0.submitBy', `The first submission deadline must be at least ${MIN_WORK_WINDOW_SECS} seconds away.`);
  }
  return { ok: errors.length === 0, errors };
}
