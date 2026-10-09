// Words of every notification (delivery-review-updates U3 table): contract events and job events in, title and one
// line of body out. Numbers come in (base units, indices, unix seconds) and are formatted here only. Chain data
// only: the on-chain title, amounts and deadlines, never brief text, milestone names or the contract key.
// Vietnam view: amounts as "≈ … VND (estimate)" and never "USDC"; transfer notices are the app's concern (A4, V1).
import type { JobEvent } from '../jobs/events.ts';
import type { ContractEvent } from './events.ts';
import { formatDeadline, formatUsdc, vndEstimate } from './format.ts';

export interface Notice {
  title: string;
  message: string;
}

/** The one money formatter of notices */
export const noticeAmount = (units: bigint, vn: boolean) => (vn ? vndEstimate(units) : formatUsdc(units));

export function contractNotice(e: ContractEvent, vn: boolean, name: string): Notice {
  const amount = noticeAmount(e.amountUnits, vn);
  const job = `“${e.title}”`;
  const n = (e.index ?? 0) + 1;
  // Events made before `role` existed: submitted went to the client, the rest to the freelancer
  const client = (e.role ?? (e.kind === 'submitted' ? 'client' : 'freelancer')) === 'client';
  switch (e.kind) {
    case 'created':
      return { title: `New contract from ${name}`, message: `${job} · ${amount}. Open it to read the brief and accept.` };
    case 'accepted':
      return { title: `${name} accepted · lock to start`, message: `${job} · ${amount}.` };
    case 'locked':
      return client
        ? { title: `Locked · ${name} can start`, message: `${amount} for ${job} is locked in the program vault.` }
        : { title: 'Locked · you can start', message: `${name} locked ${amount} for ${job} in the program vault.` };
    case 'submitted':
      return {
        title: `Milestone ${n} submitted · review by ${formatDeadline(e.reviewBy ?? 0)}`,
        message: `${name} submitted work for ${job}.`,
      };
    case 'reviewSoon':
      return {
        title: `Review milestone ${n} before ${formatDeadline(e.reviewBy ?? 0)}`,
        message: `${job}. If you don't review it, it can be released to ${name}.`,
      };
    case 'reviewOver':
      return client
        ? { title: `Review time over · milestone ${n} can be released`, message: `${amount} for ${job}. Anyone can release it now.` }
        : { title: 'Review time over · release your earnings', message: `${amount} for ${job}. Anyone can release it now, including you.` };
    case 'submitMissed':
      return client
        ? { title: `Milestone ${n} can be refunded to you`, message: `The submission deadline passed for ${job} · ${amount}.` }
        : { title: `Submission deadline passed for milestone ${n}`, message: `${amount} for ${job} can be refunded to ${name}.` };
    case 'released':
      if (client) return { title: `Milestone ${n} released`, message: `${amount} for ${job} was released to ${name}.` };
      // F2: the freelancer's next step after release is the hand-over
      return e.viaPartner
        ? { title: `Milestone ${n} released to payout partner · hand over the final files`, message: `Milestone ${n}: ${amount} for ${job} was released to the payout partner (VND transfer simulated in this demo). Hand over the final files.` }
        : { title: 'Released · hand over the final files', message: `Milestone ${n}: ${amount} for ${job} was released to your N.E.D account. Hand over the final files.` };
    case 'refunded':
      return client
        ? { title: `Milestone ${n} refunded to you`, message: `${amount} for ${job} went back to your wallet.` }
        : { title: `Milestone ${n} refunded to the client`, message: `${amount} for ${job} went back to ${name}.` };
  }
}

export function jobNotice(e: JobEvent): Notice {
  const job = `“${e.title}”`;
  switch (e.kind) {
    case 'newApplicant':
      return { title: `New applicant for ${job}`, message: `${e.applicationCount} ${e.applicationCount === 1 ? 'applicant' : 'applicants'} so far.` };
    case 'selected':
      return { title: `You were selected for ${job} · accept by ${formatDeadline(e.acceptBy ?? 0)}`, message: 'Open the contract to read the brief and accept.' };
    case 'filled':
      return { title: `${job} was filled`, message: 'Another applicant was selected.' };
    case 'budgetLocked':
      return { title: `Budget locked for ${job}`, message: 'It moves into the contract when the freelancer you selected accepts.' };
  }
}
