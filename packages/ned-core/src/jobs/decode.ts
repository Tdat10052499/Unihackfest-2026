// JobListing / JobApplication accounts → typed objects (amounts bigint, only template slots 0..milestone_count).
import { PublicKey } from '@solana/web3.js';
import idl from '../idl/ned_program.json' with { type: 'json' };
import { decodeAccount, fromBN } from '../chain/idl.ts';
import { coder } from '../milestone/decode.ts';
import { JOB_APPLICATION_SIZE, JOB_LISTING_SIZE, type JobStateName } from './layout.ts';

const discriminator = (name: string): Uint8Array =>
  Uint8Array.from((idl.accounts.find((a) => a.name === name) as { discriminator: number[] }).discriminator);
export const JOB_LISTING_DISCRIMINATOR = discriminator('JobListing');
export const JOB_APPLICATION_DISCRIMINATOR = discriminator('JobApplication');

export interface JobMilestoneTemplate {
  index: number;
  amount: bigint;
  /** Due this long after the business selects someone */
  workSecs: number;
  reviewSecs: number;
}

export interface JobListingAccount {
  address: PublicKey;
  version: number;
  state: JobStateName;
  business: PublicKey;
  category: number;
  /** Bitmask of skill indices (taxonomy.ts) */
  skills: bigint;
  mint: PublicKey;
  jobId: bigint;
  createdAt: number;
  applyBy: number;
  selectBy: number;
  total: bigint;
  milestoneCount: number;
  milestones: JobMilestoneTemplate[];
  title: string;
  summary: string;
  /** SHA-256 of the canonical brief JSON (posted in plain text with post_job_brief) */
  briefHash: Uint8Array;
  /** null until select_job */
  selected: PublicKey | null;
  selectedAt: number;
  /** The contract created at select; null until select_job */
  fund: PublicKey | null;
  applicationCount: number;
  bump: number;
  vaultBump: number;
}

export interface JobApplicationAccount {
  address: PublicKey;
  version: number;
  job: PublicKey;
  freelancer: PublicKey;
  createdAt: number;
  /** Public on-chain */
  pitch: string;
  bump: number;
}

type Raw = Record<string, any>;
const seconds = (v: { toString(): string }) => Number(fromBN(v));
const orNull = (k: PublicKey) => (k.equals(PublicKey.default) ? null : k);
const text = (bytes: number[] | Uint8Array, len?: number) => {
  const b = Uint8Array.from(bytes);
  const end = len ?? (b.indexOf(0) === -1 ? b.length : b.indexOf(0));
  return new TextDecoder().decode(b.subarray(0, end));
};

export function decodeJobListing(address: PublicKey, data: Uint8Array): JobListingAccount {
  if (data.length !== JOB_LISTING_SIZE) throw new Error(`JobListing must be ${JOB_LISTING_SIZE} bytes, got ${data.length}`);
  const j = decodeAccount<Raw>(coder, 'JobListing', data);
  const count: number = j.milestone_count;
  return {
    address,
    version: j.version,
    state: Object.keys(j.state)[0] as JobStateName,
    business: j.business,
    category: j.category,
    skills: fromBN(j.skills),
    mint: j.mint,
    jobId: fromBN(j.job_id),
    createdAt: seconds(j.created_at),
    applyBy: seconds(j.apply_by),
    selectBy: seconds(j.select_by),
    total: fromBN(j.total),
    milestoneCount: count,
    milestones: (j.milestones as Raw[]).slice(0, count).map((m, index) => ({
      index,
      amount: fromBN(m.amount),
      workSecs: seconds(m.work_secs),
      reviewSecs: seconds(m.review_secs),
    })),
    title: text(j.title),
    summary: text(j.summary),
    briefHash: Uint8Array.from(j.brief_hash as number[]),
    selected: orNull(j.selected),
    selectedAt: seconds(j.selected_at),
    fund: orNull(j.fund),
    applicationCount: j.application_count,
    bump: j.bump,
    vaultBump: j.vault_bump,
  };
}

export function decodeJobApplication(address: PublicKey, data: Uint8Array): JobApplicationAccount {
  if (data.length !== JOB_APPLICATION_SIZE) throw new Error(`JobApplication must be ${JOB_APPLICATION_SIZE} bytes, got ${data.length}`);
  const a = decodeAccount<Raw>(coder, 'JobApplication', data);
  return {
    address,
    version: a.version,
    job: a.job,
    freelancer: a.freelancer,
    createdAt: seconds(a.created_at),
    pitch: text(a.pitch, Math.min(a.pitch_len, (a.pitch as number[]).length)),
    bump: a.bump,
  };
}
