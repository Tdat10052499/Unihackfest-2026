// Scenarios for view.test.ts: every fund state / milestone status the screens can show.
import { CLIENT, FREELANCER, M, T0, type FixtureFund } from './fixture.ts';
import { DEMO_PAYOUT_PARTNER } from '../../../constants/chain.ts';

export const NAMES = { [CLIENT.toBase58()]: '@mia', [FREELANCER.toBase58()]: '@vinh' };
export const NOW = T0;
export const LATE = T0 + 600 - 59; // inside the last 60 s before the first submit_by

export const CASES: Record<string, { fund: FixtureFund; now?: number }> = {
  created: { fund: { state: 'Created', payoutKind: 'Unset', milestones: [M()] } },
  accepted: { fund: { state: 'Accepted', milestones: [M()] } },
  tooLate: { fund: { state: 'Created', payoutKind: 'Unset', milestones: [M()] }, now: LATE },
  locked: { fund: { state: 'Funded', milestones: [M()] } },
  submitted: { fund: { state: 'Funded', milestones: [M('Submitted', { submittedAt: T0 - 5 })] } },
  disputed: { fund: { state: 'Funded', milestones: [M('Disputed')] } },
  released: { fund: { state: 'Settled', released: 10_000_000n, milestones: [M('Released')] } },
  releasedPartner: {
    fund: { state: 'Settled', payoutKind: 'PayoutPartner', payoutDestination: DEMO_PAYOUT_PARTNER, released: 10_000_000n, milestones: [M('Released')] },
  },
  refunded: { fund: { state: 'Settled', refunded: 10_000_000n, milestones: [M('Refunded')] } },
  cancelled: { fund: { state: 'Settled', refunded: 10_000_000n, milestones: [M('Cancelled')] } },
};
