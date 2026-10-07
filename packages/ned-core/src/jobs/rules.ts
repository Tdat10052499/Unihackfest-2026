// Button rules for jobs, mirrored from the program checks (funded-jobs-plan.md section 4.3). The program has the final
// word; these only disable buttons and give the reason early.
import { PublicKey } from '@solana/web3.js';
import { UserFacingError } from '../chain/errors.ts';
import type { BriefDraft } from '../milestone/content.ts';
import { contentBytes, canonicalBrief, validateBrief, type ContentProblem } from '../milestone/content.ts';
import { unitsFromUsdc } from '../milestone/format.ts';
import { MAX_CONTRACT_AMOUNT, MAX_MILESTONES, MIN_REVIEW_WINDOW_SECS, MIN_WORK_WINDOW_SECS, NOTE_MAX_LEN, NOTE_MAX_PARTS, TITLE_MAX_LEN } from '../milestone/layout.ts';
import type { JobListingAccount } from './decode.ts';
import { JOB_ACCEPT_WINDOW_SECS, JOB_CATEGORY_COUNT, JOB_PITCH_MAX_LEN, JOB_SUMMARY_MAX_LEN } from './layout.ts';

type Wallet = PublicKey | string;
const same = (a: PublicKey, b: Wallet) => a.toBase58() === (typeof b === 'string' ? b : b.toBase58());
const utf8 = (s: string) => new TextEncoder().encode(s).length;

/** now > selected_at + JOB_ACCEPT_WINDOW_SECS */
export const acceptWindowOver = (job: JobListingAccount, now: number) => now > job.selectedAt + JOB_ACCEPT_WINDOW_SECS;

/** Open, before apply_by, not the business, not applied yet */
export const canApply = (job: JobListingAccount, me: Wallet, now: number, alreadyApplied = false) =>
  job.state === 'Open' && now <= job.applyBy && !same(job.business, me) && !alreadyApplied;

/** v1.4 (D29): the budget is in the job vault (post_job, or fund_job at selection); every v1.3 listing is funded */
export const isFunded = (job: JobListingAccount) => !job.unfunded;

/** Chip text for cards and the detail page (lock-at-hire-plan.md section 3) */
export const fundedLabel = (job: JobListingAccount) => (isFunded(job) ? 'Budget locked' : 'Locks when hired');

/** fund_job (program check): the business, an Open listing that is not funded yet, before select_by */
export const canFundJob = (job: JobListingAccount, me: Wallet, now: number) =>
  same(job.business, me) && job.state === 'Open' && job.unfunded && now <= job.selectBy;

/**
 * The business, before select_by: an open listing with applicants, or a re-select after the accept window. An unfunded
 * listing ("locks when hired") is only selectable when fund_job can go first in the same transaction (runSelectJob
 * does that); select_job alone is refused by the program (JobNotFunded).
 */
export const canSelect = (job: JobListingAccount, me: Wallet, now: number) =>
  same(job.business, me) &&
  now <= job.selectBy &&
  job.applicationCount > 0 &&
  (job.state === 'Open' || (job.state === 'Selected' && acceptWindowOver(job, now))) &&
  (isFunded(job) || canFundJob(job, me, now));

/** True when selecting this listing locks its budget in the same transaction (fund_job + create_fund + select_job) */
export const selectLocksBudget = (job: JobListingAccount) => !isFunded(job);

/** The business: open with no applicants (any time) or after select_by; selected, after select_by and the accept window */
export function canWithdraw(job: JobListingAccount, me: Wallet, now: number): boolean {
  if (!same(job.business, me)) return false;
  if (job.state === 'Open') return job.applicationCount === 0 || now > job.selectBy;
  if (job.state === 'Selected') return now > job.selectBy && acceptWindowOver(job, now);
  return false;
}

/** Pitch problems: empty, or over 280 bytes of UTF-8 */
export function pitchProblem(pitch: string): string | null {
  const n = utf8(pitch.trim());
  if (!n) return 'Write a short pitch.';
  if (n > JOB_PITCH_MAX_LEN) return `Keep the pitch under ${JOB_PITCH_MAX_LEN} bytes.`;
  return null;
}

/** What the business fills in on "Post a job" (funded-jobs-plan.md section 6.2) */
export interface JobDraft {
  title: string;
  summary: string;
  category: number;
  /** Skill indices (taxonomy.ts) */
  skills: number[];
  milestones: { amountUsdc: string; workSecs: number; reviewSecs: number }[];
  /** Same milestone count and order as `milestones`; hashed with the title */
  brief: BriefDraft;
  applyBy: number;
  selectBy: number;
}

/** The checks of post_job plus the brief limits; [] when the draft can be posted at `now` */
export function validateJobDraft(draft: JobDraft, now: number): ContentProblem[] {
  const out: ContentProblem[] = [];
  const title = draft.title.trim();
  if (!title) out.push({ field: 'title', message: 'Give the job a title.' });
  if (utf8(title) > TITLE_MAX_LEN) out.push({ field: 'title', message: `Keep the title under ${TITLE_MAX_LEN} bytes.` });
  const summary = draft.summary.trim();
  if (!summary) out.push({ field: 'summary', message: 'Write a short summary for the job card.' });
  if (utf8(summary) > JOB_SUMMARY_MAX_LEN) out.push({ field: 'summary', message: `Keep the summary under ${JOB_SUMMARY_MAX_LEN} bytes.` });
  if (!Number.isInteger(draft.category) || draft.category < 0 || draft.category >= JOB_CATEGORY_COUNT) out.push({ field: 'category', message: 'Choose a category.' });
  if (draft.skills.some((i) => !Number.isInteger(i) || i < 0 || i > 63)) out.push({ field: 'skills', message: 'A skill is not valid.' });
  const n = draft.milestones.length;
  if (n < 1 || n > MAX_MILESTONES) out.push({ field: 'milestones', message: `Add 1 to ${MAX_MILESTONES} milestones.` });
  let total = 0n;
  draft.milestones.forEach((m, i) => {
    const units = unitsFromUsdc(m.amountUsdc);
    if (!units || units <= 0n) out.push({ field: `milestones.${i}.amount`, message: `Enter an amount for milestone ${i + 1}.` });
    else total += units;
    if (!(m.workSecs >= MIN_WORK_WINDOW_SECS)) out.push({ field: `milestones.${i}.work`, message: `Give milestone ${i + 1} more time to do the work.` });
    if (!(m.reviewSecs >= MIN_REVIEW_WINDOW_SECS)) out.push({ field: `milestones.${i}.review`, message: `Give milestone ${i + 1} more review time.` });
  });
  if (total > MAX_CONTRACT_AMOUNT) out.push({ field: 'milestones', message: 'The total is over the 1,000 USDC limit for this demo.' });
  if (!(draft.applyBy > now)) out.push({ field: 'applyBy', message: '"Apply by" must be in the future.' });
  if (!(draft.selectBy >= draft.applyBy)) out.push({ field: 'selectBy', message: '"Select by" cannot be before "Apply by".' });
  out.push(...validateBrief(draft.brief, n));
  if (contentBytes(canonicalBrief(title, draft.brief)).length > NOTE_MAX_LEN * NOTE_MAX_PARTS) {
    out.push({ field: 'brief', message: 'The brief is too long to publish. Shorten the scope or the done-when points.' });
  }
  return out;
}

/** Sum of the template amounts in base units (0 if an amount is invalid) */
export const jobDraftTotal = (draft: JobDraft) => draft.milestones.reduce((s, m) => s + (unitsFromUsdc(m.amountUsdc) ?? 0n), 0n);

export function assertJobDraft(draft: JobDraft, now: number): void {
  const problems = validateJobDraft(draft, now);
  if (problems.length) throw new UserFacingError(problems[0].message);
}
