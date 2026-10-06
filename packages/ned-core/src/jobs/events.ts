// Job notifications (U3 table, D25 row): a new applicant for the business; selected or filled for an applicant.
// Same pattern as milestone/events.ts: compare two reads, nothing on the first read, chain data only.
import type { JobListingAccount } from './decode.ts';
import { JOB_ACCEPT_WINDOW_SECS, type JobStateName } from './layout.ts';

/** job address → state, applicant count and selected wallet, as last seen on this device */
export type JobSnapshot = Record<string, { s: JobStateName; n: number; sel: string | null }>;

export interface JobEvent {
  /** stable: `job:<job>:<kind>[:<count>]` */
  id: string;
  kind: 'newApplicant' | 'selected' | 'filled';
  job: string;
  title: string;
  applicationCount: number;
  /** selected: last moment to accept (selected_at + accept window) */
  acceptBy?: number;
  /** selected: the contract to open */
  fund?: string;
}

export function jobSnapshot(jobs: JobListingAccount[]): JobSnapshot {
  const out: JobSnapshot = {};
  for (const j of jobs) out[j.address.toBase58()] = { s: j.state, n: j.applicationCount, sel: j.selected?.toBase58() ?? null };
  return out;
}

/**
 * `mine`: listings of the signed-in business; `applied`: listings the wallet applied to. Events since `prev`.
 */
export function jobEvents(prev: JobSnapshot | null, mine: JobListingAccount[], applied: JobListingAccount[], wallet: string): JobEvent[] {
  if (!prev) return [];
  const events: JobEvent[] = [];
  for (const j of mine) {
    const job = j.address.toBase58();
    const was = prev[job];
    if (j.applicationCount > (was?.n ?? 0))
      events.push({ id: `job:${job}:newApplicant:${j.applicationCount}`, kind: 'newApplicant', job, title: j.title, applicationCount: j.applicationCount });
  }
  for (const j of applied) {
    const job = j.address.toBase58();
    const was = prev[job];
    const me = j.selected?.toBase58() === wallet;
    if (j.state === 'Selected' && me && (was?.s !== 'Selected' || was.sel !== wallet))
      events.push({
        id: `job:${job}:selected:${j.selectedAt}`,
        kind: 'selected',
        job,
        title: j.title,
        applicationCount: j.applicationCount,
        acceptBy: j.selectedAt + JOB_ACCEPT_WINDOW_SECS,
        ...(j.fund ? { fund: j.fund.toBase58() } : {}),
      });
    if (j.state === 'Filled' && !me && was?.s !== 'Filled')
      events.push({ id: `job:${job}:filled`, kind: 'filled', job, title: j.title, applicationCount: j.applicationCount });
  }
  return events;
}
