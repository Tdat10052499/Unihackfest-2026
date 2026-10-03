// FundAccount → FundView for the screens (non-ui-plan section 3). Pure: no RPC, no React.
import { shortAddress } from '../identity/resolveCore.ts';
import type { FundAccount, MilestoneAccount } from './decode.ts';
import type { DeliveryDraft } from './content.ts';
import { shortHash } from './evidence.ts';
import type { ContentStatus, ContractContent } from './notes.ts';
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
  | 'close' | 'dispute' | 'concede' | 'proposeSplit' | 'acceptSplit';

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
  /** e.g. "auto-release in 0:42" */
  countdown?: { to: number; label: string };
  /** what *this* user may do now (rules.ts) */
  actions: ActionKind[];
  /** short hash */
  evidence?: string;
  // ---- B1 (non-ui-plan 3.1): from the decrypted brief and delivery notes ----
  name?: string;
  criteria?: string[];
  delivery?: { content?: DeliveryDraft; matches?: boolean; submittedAt: number; onTime: boolean };
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
  nextAction?: { kind: ActionKind; milestone?: number; label: string };
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
}

export const RELEASED_TO_PARTNER = 'Released to payout partner · VND payout simulated in this demo';
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
          // ContractDetail board "submitMissed": anyone can refund now
          statusLabel = 'Submission deadline passed';
          tone = 'warning';
        }
        break;
      case 'Submitted': {
        if (now > m.reviewBy) {
          // Open issue 3 (owner wording, B4a): the review time is over and anyone can release
          statusLabel = role === 'client' ? 'Review time is over · anyone can release' : 'Ready to release';
          tone = 'success';
          break;
        }
        const left = formatCountdown(m.reviewBy + 1 - now);
        statusLabel = role === 'client'
          ? `Submitted · review by ${formatDeadline(m.reviewBy)} · auto-release in ${left}`
          : 'Submitted · in review';
        tone = 'warning';
        countdown = { to: m.reviewBy + 1, label: `auto-release in ${left}` };
        break;
      }
      case 'Disputed':
        statusLabel = 'Disputed · auto-release paused';
        tone = 'warning';
        break;
      case 'Released':
        statusLabel = region === 'vn' && viaPartner ? RELEASED_TO_PARTNER : 'Released';
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
    const evidence = shortHash(m.evidence);
    const briefMilestone = opts.content?.brief?.milestones[m.index];
    const delivered = opts.content?.deliveries[m.index];
    return {
      index: m.index,
      amountUnits: m.amount,
      amountLabel: amount(m.amount),
      submitBy: m.submitBy,
      reviewBy: m.reviewBy,
      status: m.status.toLowerCase() as MilestoneView['status'],
      statusLabel,
      tone,
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
  if (rules.canLock(fund, me, now)) actions.push('lock');
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
  else {
    for (const m of milestones) {
      const kind: ActionKind | undefined =
        m.actions.includes('approve') ? 'approve'
        : m.actions.includes('submit') ? 'submit'
        : role === 'freelancer' && m.actions.includes('releaseNow') ? 'releaseNow'
        : role === 'client' && m.actions.includes('refundNow') ? 'refundNow'
        : undefined;
      if (kind) {
        const verb = { approve: 'Approve', submit: 'Submit', releaseNow: 'Release', refundNow: 'Refund' }[kind as 'approve'];
        nextAction = { kind, milestone: m.index, label: `${verb} ${n(m.index)}` };
        break;
      }
    }
    if (!nextAction && actions.includes('close') && (fund.state === 'Settled' || tooLate)) {
      nextAction = { kind: 'close', label: 'Close contract' };
    }
  }

  const destination: FundView['destination'] =
    fund.payoutKind === 'OwnWallet'
      ? { kind: 'ownWallet', label: role === 'freelancer' ? 'USDC to your N.E.D wallet' : 'USDC to the freelancer’s own wallet', simulated: false }
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
