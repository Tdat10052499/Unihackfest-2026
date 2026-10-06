// Contract notifications (build-plan B5, delivery-review-updates U3): what changed between two reads of the
// signed-in wallet's contracts, for the side that should hear about it (the U3 event table). Events carry chain data
// only (title, amounts as numbers, deadlines), never brief text or a key; notices.ts turns them into words.
import type { FundAccount } from './decode.ts';
import type { FundStateName, MilestoneStatusName } from './layout.ts';

/** fund address → state and milestone statuses, as last seen on this device */
export type ContractSnapshot = Record<string, { s: FundStateName; m: MilestoneStatusName[] }>;

export type ContractEventKind =
  | 'created'
  | 'accepted'
  | 'locked'
  | 'submitted'
  | 'reviewSoon'
  | 'reviewOver'
  | 'submitMissed'
  | 'released'
  | 'refunded';

export interface ContractEvent {
  /** stable: `contract:<fund>:<kind>[:<index>]` */
  id: string;
  kind: ContractEventKind;
  /** The side this event is for (the signed-in wallet's role in the contract) */
  role?: 'client' | 'freelancer';
  fund: string;
  title: string;
  /** the other party */
  counterparty: string;
  /** milestone, for per-milestone events */
  index?: number;
  /** milestone amount, or the contract total for created / accepted / locked */
  amountUnits: bigint;
  /** submitted / reviewSoon: review deadline (unix seconds) */
  reviewBy?: number;
  viaPartner: boolean;
}

/** "Review deadline in 24 h" lead time. Devnet value (1 min); launch 24 h [Assumption] */
export const REVIEW_SOON_SECS = 60;

export function contractSnapshot(funds: FundAccount[]): ContractSnapshot {
  const out: ContractSnapshot = {};
  for (const f of funds) out[f.address.toBase58()] = { s: f.state, m: f.milestones.map((m) => m.status) };
  return out;
}

const LOCKED: FundStateName[] = ['Funded', 'Settled'];

/**
 * Events since `prev`; none on the first read (prev null), so opening the app never replays old changes.
 * Deadline events (review soon, review over, submission deadline passed) need `times`: they fire once, on the read
 * whose window (prevNow, now] crosses the deadline.
 */
export function contractEvents(
  prev: ContractSnapshot | null,
  funds: FundAccount[],
  wallet: string,
  times?: { prevNow: number; now: number }
): ContractEvent[] {
  if (!prev) return [];
  const events: ContractEvent[] = [];
  const crossed = (t: number) => times !== undefined && times.prevNow < t && t <= times.now;
  for (const f of funds) {
    const fund = f.address.toBase58();
    const freelancer = f.freelancer.toBase58() === wallet;
    const client = f.client.toBase58() === wallet;
    if (!freelancer && !client) continue;
    const role = client ? ('client' as const) : ('freelancer' as const);
    const base = {
      fund,
      role,
      title: f.title,
      counterparty: (freelancer ? f.client : f.freelancer).toBase58(),
      viaPartner: f.payoutKind === 'PayoutPartner',
    };
    const at = (kind: ContractEventKind, index?: number) => `contract:${fund}:${kind}${index === undefined ? '' : `:${index}`}`;
    const before = prev[fund];
    if (!before && freelancer) events.push({ ...base, id: at('created'), kind: 'created', amountUnits: f.total });
    const was = before ?? { s: 'Created' as FundStateName, m: f.milestones.map(() => 'Pending' as MilestoneStatusName) };
    if (client && f.state === 'Accepted' && was.s === 'Created') events.push({ ...base, id: at('accepted'), kind: 'accepted', amountUnits: f.total });
    if (f.state === 'Funded' && !LOCKED.includes(was.s)) events.push({ ...base, id: at('locked'), kind: 'locked', amountUnits: f.total });
    for (const m of f.milestones) {
      const old = was.m[m.index] ?? 'Pending';
      const one = { ...base, index: m.index, amountUnits: m.amount };
      if (old !== m.status) {
        if (client && m.status === 'Submitted') events.push({ ...one, id: at('submitted', m.index), kind: 'submitted', reviewBy: m.reviewBy });
        if (m.status === 'Released') events.push({ ...one, id: at('released', m.index), kind: 'released' });
        if (m.status === 'Refunded') events.push({ ...one, id: at('refunded', m.index), kind: 'refunded' });
      }
      if (f.state !== 'Funded') continue;
      if (client && m.status === 'Submitted' && crossed(m.reviewBy - REVIEW_SOON_SECS) && times!.now <= m.reviewBy)
        events.push({ ...one, id: at('reviewSoon', m.index), kind: 'reviewSoon', reviewBy: m.reviewBy });
      if (m.status === 'Submitted' && crossed(m.reviewBy + 1)) events.push({ ...one, id: at('reviewOver', m.index), kind: 'reviewOver' });
      if (m.status === 'Pending' && crossed(m.submitBy + 1)) events.push({ ...one, id: at('submitMissed', m.index), kind: 'submitMissed' });
    }
  }
  return events;
}
