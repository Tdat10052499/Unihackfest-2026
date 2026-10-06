// Numbers of the Overview page, computed only from the open listings read from Solana (no invented figures).
import type { JobListingAccount } from '@ned/core/jobs/decode.ts';
import { JOB_CATEGORY_COUNT } from '@ned/core/jobs/layout.ts';

export const FEATURED_COUNT = 6;
/** Bars on the "locked in N open jobs" card: one per open listing, newest first, at most this many */
export const MAX_BARS = 24;

export interface OverviewStats {
  openCount: number;
  lockedUnits: bigint;
  applications: number;
  /** open listings per category index */
  byCategory: number[];
  /** newest first */
  featured: JobListingAccount[];
  newest: JobListingAccount | null;
  /** bar heights in px (6–30), one per open listing (newest first, capped), and whether it is a top-half budget */
  bars: { height: number; high: boolean }[];
}

export function overviewStats(jobs: readonly JobListingAccount[]): OverviewStats {
  const open = jobs.filter((j) => j.state === 'Open').sort((a, b) => b.createdAt - a.createdAt);
  const byCategory = Array.from({ length: JOB_CATEGORY_COUNT }, () => 0);
  for (const j of open) if (j.category < JOB_CATEGORY_COUNT) byCategory[j.category] += 1;
  const max = open.reduce((m, j) => (j.total > m ? j.total : m), 0n);
  const bars = open.slice(0, MAX_BARS).map((j) => {
    const share = max > 0n ? Number((j.total * 1000n) / max) / 1000 : 0;
    return { height: Math.max(6, Math.round(share * 30)), high: share >= 0.5 };
  });
  return {
    openCount: open.length,
    lockedUnits: open.reduce((s, j) => s + j.total, 0n),
    applications: open.reduce((s, j) => s + j.applicationCount, 0),
    byCategory,
    featured: open.slice(0, FEATURED_COUNT),
    newest: open[0] ?? null,
    bars,
  };
}
