// Contract notifications (build-plan B5): what changed between two reads of the signed-in wallet's contracts.
// Only the other party's moves are reported: a new contract and a lock to the freelancer, a submission to the client,
// a release to the freelancer. Events carry chain data only (title, amounts, deadlines), never brief text or a key.
import type { FundAccount } from './decode.ts';
import type { FundStateName, MilestoneStatusName } from './layout.ts';

/** fund address → state and milestone statuses, as last seen on this device */
export type ContractSnapshot = Record<string, { s: FundStateName; m: MilestoneStatusName[] }>;

export interface ContractEvent {
  /** stable: `contract:<fund>:<kind>[:<index>]` */
  id: string;
  kind: 'created' | 'locked' | 'submitted' | 'released';
  fund: string;
  title: string;
  /** the other party */
  counterparty: string;
  /** milestone, for submitted / released */
  index?: number;
  /** milestone amount, or the contract total for created / locked */
  amountUnits: bigint;
  /** submitted: review deadline (unix seconds) */
  reviewBy?: number;
  viaPartner: boolean;
}

export function contractSnapshot(funds: FundAccount[]): ContractSnapshot {
  const out: ContractSnapshot = {};
  for (const f of funds) out[f.address.toBase58()] = { s: f.state, m: f.milestones.map((m) => m.status) };
  return out;
}

const LOCKED: FundStateName[] = ['Funded', 'Settled'];

/** Events since `prev`; none on the first read (prev null), so opening the app never replays old changes */
export function contractEvents(prev: ContractSnapshot | null, funds: FundAccount[], wallet: string): ContractEvent[] {
  if (!prev) return [];
  const events: ContractEvent[] = [];
  for (const f of funds) {
    const fund = f.address.toBase58();
    const freelancer = f.freelancer.toBase58() === wallet;
    const client = f.client.toBase58() === wallet;
    if (!freelancer && !client) continue;
    const base = {
      fund,
      title: f.title,
      counterparty: (freelancer ? f.client : f.freelancer).toBase58(),
      viaPartner: f.payoutKind === 'PayoutPartner',
    };
    const before = prev[fund];
    if (!before && freelancer) events.push({ ...base, id: `contract:${fund}:created`, kind: 'created', amountUnits: f.total });
    const was = before ?? { s: 'Created' as FundStateName, m: f.milestones.map(() => 'Pending' as MilestoneStatusName) };
    if (freelancer && f.state === 'Funded' && !LOCKED.includes(was.s))
      events.push({ ...base, id: `contract:${fund}:locked`, kind: 'locked', amountUnits: f.total });
    for (const m of f.milestones) {
      const old = was.m[m.index] ?? 'Pending';
      if (old === m.status) continue;
      if (client && m.status === 'Submitted')
        events.push({ ...base, id: `contract:${fund}:submitted:${m.index}`, kind: 'submitted', index: m.index, amountUnits: m.amount, reviewBy: m.reviewBy });
      if (freelancer && m.status === 'Released')
        events.push({ ...base, id: `contract:${fund}:released:${m.index}`, kind: 'released', index: m.index, amountUnits: m.amount });
    }
  }
  return events;
}
