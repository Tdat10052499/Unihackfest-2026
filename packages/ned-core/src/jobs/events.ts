// Job notifications (U3 table, D25 row): a new applicant for the business; selected or filled for an applicant.
// Same pattern as milestone/events.ts: compare two reads, nothing on the first read, chain data only.
import { PublicKey } from '@solana/web3.js';
import { fromBN } from '../chain/idl.ts';
import { coder } from '../milestone/decode.ts';
import type { JobListingAccount } from './decode.ts';
import { JOB_ACCEPT_WINDOW_SECS, type JobStateName } from './layout.ts';

/** job address → state, applicant count, selected wallet and (v1.4) unfunded, as last seen on this device */
export type JobSnapshot = Record<string, { s: JobStateName; n: number; sel: string | null; u?: boolean }>;

export interface JobEvent {
  /** stable: `job:<job>:<kind>[:<count>]` */
  id: string;
  /** budgetLocked (v1.4, D29): the business's "locks when hired" listing was funded (JobFunded) at selection */
  kind: 'newApplicant' | 'selected' | 'filled' | 'budgetLocked';
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
  for (const j of jobs) out[j.address.toBase58()] = { s: j.state, n: j.applicationCount, sel: j.selected?.toBase58() ?? null, u: j.unfunded };
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
    // v1.4: last seen unfunded, now funded (only from a snapshot that recorded `u`)
    if (was?.u === true && !j.unfunded)
      events.push({ id: `job:${job}:budgetLocked`, kind: 'budgetLocked', job, title: j.title, applicationCount: j.applicationCount, ...(j.fund ? { fund: j.fund.toBase58() } : {}) });
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

// ---- Program events from transaction logs (v1.4, D29): for the bell and the history ----

export type JobLogEvent =
  | { name: 'JobPostedOpen'; job: string; business: string; jobId: bigint; category: number; total: bigint; applyBy: number; selectBy: number; briefHash: Uint8Array }
  | { name: 'JobFunded'; job: string; total: bigint };

const PROGRAM_DATA = 'Program data: ';

/** JobPostedOpen ("locks when hired" listing posted, `total` is the planned budget) and JobFunded from a transaction's logs */
export function jobLogEvents(logs: readonly string[] | null | undefined): JobLogEvent[] {
  const out: JobLogEvent[] = [];
  for (const line of logs ?? []) {
    if (!line.startsWith(PROGRAM_DATA)) continue;
    let ev: { name: string; data: Record<string, any> } | null = null;
    try {
      ev = coder.events.decode(line.slice(PROGRAM_DATA.length));
    } catch {
      ev = null;
    }
    if (!ev) continue;
    const d = ev.data;
    const key = (k: PublicKey) => new PublicKey(k).toBase58();
    if (ev.name === 'JobPostedOpen' || ev.name === 'jobPostedOpen')
      out.push({
        name: 'JobPostedOpen',
        job: key(d.job),
        business: key(d.business),
        jobId: fromBN(d.job_id),
        category: d.category,
        total: fromBN(d.total),
        applyBy: Number(fromBN(d.apply_by)),
        selectBy: Number(fromBN(d.select_by)),
        briefHash: Uint8Array.from(d.brief_hash as number[]),
      });
    else if (ev.name === 'JobFunded' || ev.name === 'jobFunded') out.push({ name: 'JobFunded', job: key(d.job), total: fromBN(d.total) });
  }
  return out;
}
