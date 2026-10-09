// FundAccount → FundView for the screens (non-ui-plan section 3). Pure: no RPC, no React.
import { shortAddress } from '../identity/resolveCore.ts';
import type { FundAccount, MilestoneAccount } from './decode.ts';
import type { DeliveryDraft } from './content.ts';
import { shortHash } from './evidence.ts';
import { handoverSent, revisionAfterLatestReview, type ContentStatus, type ContractContent, type MilestoneHistory } from './notes.ts';
import { formatCountdown, formatDeadline, formatUsdc, vndEstimate } from './format.ts';
import { vaultPda } from './pda.ts';
import * as rules from './rules.ts';

export type { ContractDraft, DraftCheck } from './rules.ts';
export type { FundAccount, MilestoneAccount } from './decode.ts';

export type Role = 'client' | 'freelancer';
export type Region = 'vn' | 'intl';
export type ChipTone = 'info' | 'accent' | 'warning' | 'success' | 'neutral';
export type ActionKind =
  | 'accept' | 'lock' | 'submit' | 'approve' | 'releaseNow' | 'refundNow'
  | 'close' | 'dispute' | 'concede' | 'proposeSplit' | 'acceptSplit'
  // D27: request changes = dispute + review note (or a review note alone on a Disputed milestone); a revised version
  // and the final-files handover are delivery notes
  | 'requestChanges' | 'sendRevision' | 'handover'
  // Funded Jobs: move the job's locked budget into this contract (lock_from_job)
  | 'lockFromJob';

export interface MilestoneView {
  index: number;
  amountUnits: bigint;
  /** "10.00 USDC" or "≈ 260,000 VND (estimate)" */
  amountLabel: string;
  /** unix seconds, chain time */
  submitBy: number;
  reviewBy: number;
  status: 'pending' | 'submitted' | 'disputed' | 'released' | 'refunded' | 'cancelled';
  statusLabel: string;
  tone: ChipTone;
  /** A second line under the status (D27: while changes are requested) */
  statusLine?: string;
  /** Vietnam view, released through the payout partner: the simulated-VND note */
  releasedNote?: string;
  /** e.g. "Release opens in 0:42 if not reviewed" */
  countdown?: { to: number; label: string };
  /** what *this* user may do now (rules.ts) */
  actions: ActionKind[];
  /** short hash */
  evidence?: string;
  // ---- B1 (non-ui-plan 3.1): from the decrypted brief and delivery notes ----
  name?: string;
  criteria?: string[];
  delivery?: { content?: DeliveryDraft; matches?: boolean; submittedAt: number; onTime: boolean };
  /** D27: every delivery (first, revisions, handover) and review of this milestone, oldest first */
  history?: MilestoneHistory;
}

export interface FundView {
  address: string;
  title: string;
  role: Role;
  region: Region;
  counterparty: { wallet: string; username?: string };
  totalLabel: string;
  lockedLabel: string;
  destination: { kind: 'ownWallet' | 'payoutPartner'; label: string; simulated: boolean } | null;
  state: 'created' | 'accepted' | 'funded' | 'settled';
  statusLabel: string;
  tone: ChipTone;
  milestones: MilestoneView[];
  nextAction?: { kind: ActionKind; milestone?: number; label: string; detail?: string };
  needsMyAction: boolean;
  /** work window passed before lock */
  tooLate: boolean;
  explorerUrl: string;
  vaultExplorerUrl: string;
  // ---- additions to the section 3 interface (N8) ----
  /** Fund-level actions this user may do now: accept, lock, close, proposeSplit, acceptSplit */
  actions: ActionKind[];
  /** Pending split proposal (P1), when FEATURES.dispute is on */
  split?: { proposedByMe: boolean; toFreelancerUnits: bigint; toFreelancerLabel: string; toClientLabel: string };
  // ---- B1 (non-ui-plan 3.1) ----
  /** Short brief fingerprint (on-chain brief_hash) */
  briefHash: string;
  contentStatus: ContentStatus;
  inviteLink?: string;
}

export interface ViewOptions {
  /** Decrypted content (useContractContent); without it contentStatus is 'loading' */
  content?: ContractContent;
  /** Invite link, when this device holds the contract key */
  inviteLink?: string;
  /** wallet → display name ("@vinh" or a short address), from identity displayNamesFor */
  names?: Record<string, string>;
  /** Show P1 actions (dispute, concede, split). Default false; ned-wallet passes FEATURES.dispute */
  p1?: boolean;
  /**
   * The job listing whose `fund` is this contract (jobs/queries jobForFund), when there is one. A job contract never
   * offers the normal Lock: its budget is already locked in the job and moves with lock_from_job.
   */
  job?: { address: string; state: 'Open' | 'Selected' | 'Filled' | 'Withdrawn' };
}

export const RELEASED_TO_PARTNER = 'Released to payout partner · VND transfer simulated in this demo';
/** D27: shown to both sides while a milestone is Disputed */
export const DISPUTED_STATUS_LINE = 'No deadline while changes are requested. The amount stays locked until you both agree.';
export const REVIEW_TIME_OVER = 'Review time over · ready to release';
export const releaseOpensIn = (left: string) => `Release opens in ${left} if not reviewed`;
const explorer = (address: string) => `https://explorer.solana.com/address/${address}?cluster=devnet`;

export function toFundView(fund: FundAccount, me: string, region: Region, now: number, opts: ViewOptions = {}): FundView {
  const p1 = opts.p1 ?? false;
  const role: Role = fund.client.toBase58() === me ? 'client' : 'freelancer';
  const other = (role === 'client' ? fund.freelancer : fund.client).toBase58();
  const name = (wallet: string) => opts.names?.[wallet] ?? shortAddress(wallet);
  const otherName = name(other);
  const amount = (units: bigint) => (region === 'vn' ? vndEstimate(units) : formatUsdc(units));
  const tooLate = rules.isTooLate(fund, now);
  const viaPartner = fund.payoutKind === 'PayoutPartner';

  // ---- fund-level label before lock and after settle ----
  let preLock: { label: string; tone: ChipTone } | null = null;
  if (tooLate) {
    preLock = {
      label: role === 'client' ? 'Not enough time left · close and create a new contract' : 'Not enough time left to accept',
      tone: 'neutral',
    };
  } else if (fund.state === 'Created') {
    preLock = { label: role === 'client' ? `Waiting for ${otherName} to accept` : 'New contract · review and accept', tone: 'info' };
  } else if (fund.state === 'Accepted') {
    preLock = { label: role === 'client' ? 'Ready to lock' : `Accepted · waiting for ${otherName} to lock`, tone: 'info' };
  }

  // ---- milestones ----
  const milestoneView = (m: MilestoneAccount): MilestoneView => {
    let statusLabel: string;
    let tone: ChipTone;
    let countdown: MilestoneView['countdown'];
    switch (m.status) {
      case 'Pending':
        statusLabel = preLock?.label ?? 'Locked · work in progress';
        tone = preLock?.tone ?? 'accent';
        if (fund.state === 'Funded' && now <= m.submitBy) {
          countdown = { to: m.submitBy, label: `submit within ${formatCountdown(m.submitBy - now)}` };
        } else if (fund.state === 'Funded') {
          // ContractDetail board "submitMissed": anyone can refund now (U4: both sides see it)
          statusLabel = role === 'client' ? 'Submission deadline passed · can be refunded to you' : 'Submission deadline passed · can be refunded to the client';
          tone = 'warning';
        }
        break;
      case 'Submitted': {
        if (now > m.reviewBy) {
          // U4: the review time is over; anyone can release, nothing happens by itself. Same label for both sides
          statusLabel = REVIEW_TIME_OVER;
          tone = 'success';
          break;
        }
        const left = formatCountdown(m.reviewBy + 1 - now);
        statusLabel = role === 'client'
          ? `Submitted · review by ${formatDeadline(m.reviewBy)} · ${releaseOpensIn(left)}`
          : 'Submitted · in review';
        tone = 'warning';
        countdown = { to: m.reviewBy + 1, label: releaseOpensIn(left) };
        break;
      }
      case 'Disputed': {
        // D27 labels (review-decision-plan section 3)
        const revised = revisionAfterLatestReview(opts.content?.history[m.index]);
        statusLabel = role === 'client'
          ? revised ? 'Revised version received · review it' : `Changes requested · waiting for ${otherName}`
          : revised ? `Revised version sent · waiting for ${otherName}` : 'Changes requested · send a revised version';
        tone = 'warning';
        break;
      }
      case 'Released':
        if (opts.content) {
          const handed = handoverSent(opts.content.history[m.index]);
          statusLabel = role === 'client'
            ? handed ? 'Final files received' : 'Released · waiting for final files'
            : handed ? 'Final files handed over' : 'Released · hand over the final files';
        } else {
          statusLabel = region === 'vn' && viaPartner ? RELEASED_TO_PARTNER : 'Released';
        }
        tone = 'success';
        break;
      case 'Refunded':
        statusLabel = role === 'client' ? 'Refunded to you' : 'Refunded to client';
        tone = 'neutral';
        break;
      case 'Cancelled':
        statusLabel = 'Ended by agreement';
        tone = 'neutral';
        break;
    }
    const actions: ActionKind[] = [];
    if (rules.canSubmit(fund, me, m.index, now)) actions.push('submit');
    if (rules.canApprove(fund, me, m.index)) actions.push('approve');
    if (rules.canReleaseAfterReview(fund, m.index, now)) actions.push('releaseNow');
    if (rules.canRefund(fund, m.index, now)) actions.push('refundNow');
    if (p1 && rules.canDispute(fund, me, m.index, now)) actions.push('dispute');
    if (p1 && rules.canConcede(fund, me, m.index)) actions.push('concede');
    if (p1 && rules.canRequestChanges(fund, me, m.index, now)) actions.push('requestChanges');
    if (p1 && rules.canSendRevision(fund, me, m.index)) actions.push('sendRevision');
    if (rules.canHandover(fund, me, m.index)) actions.push('handover');
    const evidence = shortHash(m.evidence);
    const briefMilestone = opts.content?.brief?.milestones[m.index];
    const delivered = opts.content?.deliveries[m.index];
    const history = opts.content?.history?.[m.index];
    return {
      index: m.index,
      amountUnits: m.amount,
      amountLabel: amount(m.amount),
      submitBy: m.submitBy,
      reviewBy: m.reviewBy,
      status: m.status.toLowerCase() as MilestoneView['status'],
      statusLabel,
      tone,
      ...(m.status === 'Disputed' ? { statusLine: DISPUTED_STATUS_LINE } : {}),
      ...(m.status === 'Released' && region === 'vn' && viaPartner ? { releasedNote: RELEASED_TO_PARTNER } : {}),
      ...(countdown ? { countdown } : {}),
      actions,
      ...(evidence ? { evidence } : {}),
      ...(briefMilestone ? { name: briefMilestone.name, criteria: briefMilestone.criteria } : {}),
      ...(m.submittedAt > 0
        ? {
            delivery: {
              ...(delivered?.content ? { content: delivered.content } : {}),
              ...(delivered ? { matches: delivered.matches } : {}),
              submittedAt: m.submittedAt,
              onTime: m.submittedAt <= m.submitBy,
            },
          }
        : {}),
      ...(history ? { history } : {}),
    };
  };
  const milestones = fund.milestones.map(milestoneView);

  // ---- fund-level status ----
  let statusLabel: string;
  let tone: ChipTone;
  if (preLock) ({ label: statusLabel, tone } = preLock);
  else if (fund.state === 'Settled') [statusLabel, tone] = ['Completed', 'success'];
  else {
    const focus = milestones.find((m) => m.status === 'disputed') ?? milestones.find((m) => m.status === 'submitted');
    [statusLabel, tone] = focus ? [focus.statusLabel, focus.tone] : ['Locked · work in progress', 'accent'];
  }

  // ---- fund-level actions ----
  const actions: ActionKind[] = [];
  if (rules.canAccept(fund, me, now)) actions.push('accept');
  // A job contract never offers the normal Lock (the budget would leave the business wallet twice)
  if (!opts.job && rules.canLock(fund, me, now)) actions.push('lock');
  if (opts.job?.state === 'Selected' && fund.state === 'Accepted' && rules.workWindowOk(fund.milestones, now)) actions.push('lockFromJob');
  if (rules.canClose(fund, me)) actions.push('close');
  if (p1 && rules.canProposeSplit(fund, me)) actions.push('proposeSplit');
  if (p1 && rules.canAcceptSplit(fund, me)) actions.push('acceptSplit');

  let split: FundView['split'];
  if (p1 && fund.state === 'Funded' && fund.cancelProposer) {
    const toClient = rules.unsettled(fund) - fund.cancelFreelancerAmount;
    split = {
      proposedByMe: fund.cancelProposer.toBase58() === me,
      toFreelancerUnits: fund.cancelFreelancerAmount,
      toFreelancerLabel: amount(fund.cancelFreelancerAmount),
      toClientLabel: amount(toClient < 0n ? 0n : toClient),
    };
  }

  // ---- next action for this user ----
  const n = (i: number) => `milestone ${i + 1}`;
  let nextAction: FundView['nextAction'];
  if (actions.includes('acceptSplit')) nextAction = { kind: 'acceptSplit', label: 'Review the proposed split' };
  else if (actions.includes('accept')) nextAction = { kind: 'accept', label: 'Accept and choose where your earnings go' };
  else if (actions.includes('lock')) nextAction = { kind: 'lock', label: `Lock ${amount(fund.total)}` };
  else if (actions.includes('lockFromJob')) nextAction = { kind: 'lockFromJob', label: 'Move locked budget' };
  else {
    for (const m of milestones) {
      const revised = revisionAfterLatestReview(m.history);
      const kind: ActionKind | undefined =
        // U4: when the review time is over, both roles get Release now as the primary action (before Approve)
        m.actions.includes('releaseNow') ? 'releaseNow'
        : m.actions.includes('approve') && (m.status !== 'disputed' || revised) ? 'approve'
        : m.actions.includes('submit') ? 'submit'
        : role === 'client' && m.actions.includes('refundNow') ? 'refundNow'
        : m.actions.includes('sendRevision') && !revised ? 'sendRevision'
        : m.status === 'released' && opts.content && m.actions.includes('handover') && !handoverSent(m.history) ? 'handover'
        : undefined;
      if (kind === 'releaseNow') {
        nextAction = {
          kind,
          milestone: m.index,
          label: 'Release now',
          detail: role === 'client'
            ? `You didn't review by ${formatDeadline(m.reviewBy)}. This milestone can now be released to ${otherName}. Anyone can do this, including you.`
            : 'Review time is over. Release your earnings now.',
        };
        break;
      }
      if (kind) {
        const label = {
          approve: `Approve ${n(m.index)}`,
          submit: `Submit ${n(m.index)}`,
          refundNow: 'Refund now',
          sendRevision: 'Send a revised version',
          handover: 'Hand over the final files',
        }[kind as 'approve'];
        nextAction = { kind, milestone: m.index, label };
        break;
      }
    }
    if (!nextAction && actions.includes('close') && (fund.state === 'Settled' || tooLate)) {
      nextAction = { kind: 'close', label: 'Close contract' };
    }
  }

  const destination: FundView['destination'] =
    fund.payoutKind === 'OwnWallet'
      ? { kind: 'ownWallet', label: role === 'freelancer' ? 'USDC to your N.E.D account' : 'USDC to the freelancer’s own wallet', simulated: false }
      : fund.payoutKind === 'PayoutPartner'
        ? { kind: 'payoutPartner', label: 'VND to a Vietnamese bank account through a payout partner (simulated)', simulated: true }
        : null;

  const otherLabel = opts.names?.[other];
  const address = fund.address.toBase58();
  return {
    address,
    title: fund.title,
    role,
    region,
    counterparty: { wallet: other, ...(otherLabel?.startsWith('@') ? { username: otherLabel.slice(1) } : {}) },
    totalLabel: amount(fund.total),
    lockedLabel: amount(fund.state === 'Funded' ? rules.unsettled(fund) : 0n),
    destination,
    state: fund.state.toLowerCase() as FundView['state'],
    statusLabel,
    tone,
    milestones,
    ...(nextAction ? { nextAction } : {}),
    needsMyAction: nextAction !== undefined,
    tooLate,
    explorerUrl: explorer(address),
    vaultExplorerUrl: explorer(vaultPda(fund.address).toBase58()),
    actions,
    ...(split ? { split } : {}),
    briefHash: shortHash(fund.briefHash),
    contentStatus: opts.content?.contentStatus ?? 'loading',
    ...(opts.inviteLink ? { inviteLink: opts.inviteLink } : {}),
  };
}
