// Shared words of the job pages (appendix H.16–H.18). Pure functions.
import type { JobListingAccount } from '@ned/core/jobs/decode.ts';
import { JOB_ACCEPT_WINDOW_SECS } from '@ned/core/jobs/layout.ts';
import type { FundAccount } from '@ned/core/milestone/decode.ts';
import { formatCountdown, formatDeadline } from '@ned/core/milestone/format.ts';

const DAY = 86_400;
const HOUR = 3_600;

/** "3 days", "1 day", or the devnet minutes / hours ("10 min", "2 h") */
export function spanLabel(seconds: number): string {
  if (seconds >= DAY && seconds % DAY === 0) return seconds === DAY ? '1 day' : `${seconds / DAY} days`;
  if (seconds >= DAY) return `${Math.round((seconds / DAY) * 10) / 10} days`;
  if (seconds >= HOUR) return `${Math.round(seconds / HOUR)} h`;
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

/** "Due 3 days after you are selected · 2 days to review" */
export const dueLabel = (workSecs: number, reviewSecs: number) => `Due ${spanLabel(workSecs)} after you are selected · ${spanLabel(reviewSecs)} to review`;

/** The board's fixed wording for the accept window (launch 48 h, devnet 2 min) */
export const ACCEPT_WINDOW_LABEL = '48 h (2 min on devnet)';

/** "9 Oct, 18:00 · 2 days left" / "· closed" */
export function untilLabel(t: number, now: number): string {
  if (now > t) return `${formatDeadline(t)} · closed`;
  const left = t - now;
  return `${formatDeadline(t)} · ${left >= DAY ? `${Math.floor(left / DAY)} ${Math.floor(left / DAY) === 1 ? 'day' : 'days'} left` : `${formatCountdown(left)} left`}`;
}

export const acceptBy = (job: JobListingAccount) => job.selectedAt + JOB_ACCEPT_WINDOW_SECS;

/** The business on the job page: facts from its contracts as client (H.16). Never a rating */
export function businessFacts(funds: FundAccount[]): { label: string; value: string }[] {
  const released = funds.filter((f) => f.milestones.some((m) => m.status === 'Released'));
  const submitted = funds.flatMap((f) => f.milestones.filter((m) => m.submittedAt > 0));
  const disputedNow = funds.flatMap((f) => f.milestones.filter((m) => m.status === 'Disputed'));
  const first = funds.reduce((t, f) => (t === 0 || f.createdAt < t ? f.createdAt : t), 0);
  return [
    { label: 'Contracts with a released milestone', value: String(released.length) },
    { label: 'Milestones submitted to them', value: String(submitted.length) },
    { label: 'Milestones still locked by a request', value: String(disputedNow.length) },
    { label: 'First contract', value: first ? new Date(first * 1000).toLocaleString('en-GB', { month: 'short', year: 'numeric' }) : '—' },
  ];
}

/** An applicant's track record as freelancer (H.18): short facts, never a rating */
export function applicantFacts(funds: FundAccount[], business: string): string[] {
  const completed = funds.filter((f) => f.state === 'Settled' && f.released > 0n).length;
  const submitted = funds.flatMap((f) => f.milestones.filter((m) => m.submittedAt > 0));
  const onTime = submitted.filter((m) => m.submittedAt <= m.submitBy).length;
  const refunds = funds.flatMap((f) => f.milestones.filter((m) => m.status === 'Refunded')).length;
  const before = funds.some((f) => f.client.toBase58() === business);
  if (!funds.length) return ['New on N.E.D'];
  const out = [completed === 1 ? '1 contract completed' : `${completed} contracts completed`];
  if (submitted.length) out.push(`${onTime} of ${submitted.length} submitted on time`);
  out.push(refunds === 1 ? '1 refund' : `${refunds} refunds`);
  if (before) out.push('Worked with you before');
  return out;
}
export const completedCount = (funds: FundAccount[] | undefined) => (funds ?? []).filter((f) => f.state === 'Settled' && f.released > 0n).length;
