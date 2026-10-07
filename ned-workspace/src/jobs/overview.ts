// Numbers of the Overview page, computed only from the open listings read from Solana (no invented figures).
import type { JobListingAccount } from '@ned/core/jobs/decode.ts';
import { JOB_CATEGORY_COUNT } from '@ned/core/jobs/layout.ts';
import { USD_VND_RATE } from '@ned/core/constants.ts';

/** The featured split shows the four newest open listings (V5.4) */
export const FEATURED_COUNT = 4;

export interface OverviewStats {
  openCount: number;
  /** Funded open listings only (v1.4, D29: a listing that locks when hired has nothing locked) */
  lockedUnits: bigint;
  /** Open listings that lock when hired */
  unfundedCount: number;
  applications: number;
  /** open listings per category index */
  byCategory: number[];
  /** newest first */
  featured: JobListingAccount[];
  newest: JobListingAccount | null;
  /** The newest open listing with its budget locked (the hero's "Newest funded job") */
  newestFunded: JobListingAccount | null;
}

export function overviewStats(jobs: readonly JobListingAccount[]): OverviewStats {
  const open = jobs.filter((j) => j.state === 'Open').sort((a, b) => b.createdAt - a.createdAt);
  const byCategory = Array.from({ length: JOB_CATEGORY_COUNT }, () => 0);
  for (const j of open) if (j.category < JOB_CATEGORY_COUNT) byCategory[j.category] += 1;
  return {
    openCount: open.length,
    lockedUnits: open.reduce((s, j) => (j.unfunded ? s : s + j.total), 0n),
    unfundedCount: open.filter((j) => j.unfunded).length,
    applications: open.reduce((s, j) => s + j.applicationCount, 0),
    byCategory,
    featured: open.slice(0, FEATURED_COUNT),
    newest: open[0] ?? null,
    newestFunded: open.find((j) => !j.unfunded) ?? null,
  };
}

const fixed = (n: number, digits: number) => n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/**
 * The locked total for the hero counter, from a running USDC number: "115.00 USDC", or in the Vietnam view
 * "≈ 3.0M VND" from one million up and "≈ 390,000 VND" below (the same 26,019.5 rate as every VND estimate).
 */
export function lockedStatLabel(usdc: number, vn: boolean): string {
  if (!vn) return `${fixed(usdc, 2)} USDC`;
  const vnd = usdc * USD_VND_RATE;
  if (vnd >= 1_000_000) return `≈ ${fixed(vnd / 1_000_000, 1)}M VND`;
  return `≈ ${fixed(Math.round(vnd / 1000) * 1000, 0)} VND`;
}
