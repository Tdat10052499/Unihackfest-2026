// Find jobs (appendix H.15): the URL ↔ view state, the board's budget presets and the rows of the two "My" tabs.
// Pure: no React, no RPC.
import type { JobApplicationAccount, JobListingAccount } from '@ned/core/jobs/decode.ts';
import { JOB_ACCEPT_WINDOW_SECS } from '@ned/core/jobs/layout.ts';
import { filterJobs, filtersFromQuery, filtersToQuery, type FilterContext, type JobFilters } from '@ned/core/jobs/search.ts';
import { formatDeadline, vndFromUnits } from '@ned/core/milestone/format.ts';

export type FindTab = 'open' | 'applied' | 'listings';
export const PAGE_SIZE = 9;

/** View state from the URL: the core filters plus the tab (`tab=applied|listings`; open is the default) */
export function viewFromQuery(query: string | URLSearchParams): { filters: JobFilters; tab: FindTab } {
  const p = typeof query === 'string' ? new URLSearchParams(query.startsWith('?') ? query.slice(1) : query) : query;
  const t = p.get('tab');
  return { filters: filtersFromQuery(p), tab: t === 'applied' || t === 'listings' ? t : 'open' };
}

/** URL query for a view (filters first, in the core's fixed order, then the tab) */
export function viewToQuery(filters: JobFilters, tab: FindTab): string {
  const q = filtersToQuery(filters);
  const t = tab === 'open' ? '' : `tab=${tab}`;
  return [q, t].filter(Boolean).join('&');
}

export const filtersOn = (f: JobFilters) => Boolean(f.q || f.cat || f.skills?.length || f.min !== undefined || f.max !== undefined || f.dur || f.ms || f.soon || f.hide);

/** Budget presets of the board (whole USDC; the Vietnam view shows the ≈ VND range of the same amounts) */
export const BUDGETS = [
  { id: 'lt20', min: undefined, max: 20 },
  { id: '20to50', min: 20, max: 50 },
  { id: 'gt50', min: 50, max: undefined },
] as const;

const vnd = (usdc: number) => `≈ ${vndFromUnits(BigInt(usdc) * 1_000_000n).toLocaleString('en-US')} VND`;
export function budgetLabel(id: (typeof BUDGETS)[number]['id'], vn: boolean): string {
  if (id === 'lt20') return vn ? `Under ${vnd(20)}` : 'Under 20 USDC';
  if (id === '20to50') return vn ? `${vnd(20)} – ${vnd(50).slice(2)}` : '20 – 50 USDC';
  return vn ? `Over ${vnd(50)}` : 'Over 50 USDC';
}
/** The preset that matches the URL's min/max, '' for none, 'custom' for another range */
export function budgetPreset(f: JobFilters): string {
  if (f.min === undefined && f.max === undefined) return '';
  return BUDGETS.find((b) => b.min === f.min && b.max === f.max)?.id ?? 'custom';
}

/** Open jobs that pass every filter except the category (for the chip counts), per category id and in total */
export function categoryCounts(jobs: readonly JobListingAccount[], f: JobFilters, ctx: FilterContext, ids: readonly string[]) {
  const rest = filterJobs(jobs, { ...f, cat: undefined }, ctx);
  const byId: Record<string, number> = {};
  for (const id of ids) byId[id] = filterJobs(rest, { cat: id }, ctx).length;
  return { all: rest.length, byId };
}

export const countLabel = (n: number, on: boolean) => `${n === 1 ? '1 open job' : `${n} open jobs`}${on ? ' match' : ''}`;

export type Tone = 'info' | 'purple' | 'success' | 'neutral' | 'warning';
export interface Row {
  key: string;
  /** Avatar seed: the business (applications) or the hired freelancer / me (listings) */
  seed: string;
  title: string;
  meta: string;
  units: bigint;
  /** second money line outside the Vietnam view */
  sub: string;
  status: string;
  tone: Tone;
  cta: string;
  href: string;
  primary: boolean;
}

const date = (t: number) => formatDeadline(t);

/** H.15 "My applications" rows */
export function applicationRows(items: { application: JobApplicationAccount; job: JobListingAccount | null }[], me: string, name: (wallet: string) => string, now: number): Row[] {
  return items.flatMap(({ application: a, job: j }): Row[] => {
    if (!j) return [];
    const biz = name(j.business.toBase58());
    const base = { key: a.address.toBase58(), seed: j.business.toBase58(), title: j.title, units: j.total, sub: 'test USDC, locked' };
    const jobHref = `/jobs/${j.address.toBase58()}`;
    const selectedMe = j.selected?.toBase58() === me;
    if (j.state === 'Selected' && selectedMe) {
      const by = j.selectedAt + JOB_ACCEPT_WINDOW_SECS;
      return [{ ...base, meta: `${biz} · selected ${date(j.selectedAt)} · accept by ${date(by)}`, status: now > by ? 'Selected · accept time over' : 'Selected · accept now', tone: now > by ? 'warning' : 'success', cta: 'Review & accept', href: j.fund ? `/contract/${j.fund.toBase58()}` : jobHref, primary: true }];
    }
    if (j.state === 'Filled')
      return [selectedMe
        ? { ...base, meta: `${biz} · hired · contract created`, status: 'Hired', tone: 'purple', cta: 'Open contract', href: j.fund ? `/contract/${j.fund.toBase58()}` : jobHref, primary: false }
        : { ...base, meta: `${biz} · applied ${date(a.createdAt)} · filled`, status: 'Not selected', tone: 'neutral', cta: 'View job', href: jobHref, primary: false }];
    if (j.state === 'Withdrawn') return [{ ...base, meta: `${biz} · applied ${date(a.createdAt)} · budget returned to the business`, status: 'Closed', tone: 'neutral', cta: 'View job', href: jobHref, primary: false }];
    if (j.state === 'Selected') return [{ ...base, meta: `${biz} · applied ${date(a.createdAt)} · another applicant was selected`, status: 'Not selected yet', tone: 'neutral', cta: 'View job', href: jobHref, primary: false }];
    return [{ ...base, meta: `${biz} · applied ${date(a.createdAt)} · selects by ${date(j.selectBy)}`, status: 'Applied', tone: 'info', cta: 'View job', href: jobHref, primary: false }];
  });
}

/** H.15 "My listings" rows */
export function listingRows(jobs: JobListingAccount[], me: string, name: (wallet: string) => string): Row[] {
  return jobs.map((j) => {
    const base = { key: j.address.toBase58(), seed: me, title: j.title, units: j.total };
    const applicants = j.applicationCount === 0 ? 'No applicants' : j.applicationCount === 1 ? '1 applicant' : `${j.applicationCount} applicants`;
    const applicantsHref = `/jobs/${j.address.toBase58()}/applicants`;
    switch (j.state) {
      case 'Open':
        return { ...base, meta: `${applicants} · select by ${date(j.selectBy)} · posted ${date(j.createdAt)}`, sub: 'locked in the job', status: 'Open', tone: 'success' as Tone, cta: 'Review applicants', href: applicantsHref, primary: j.applicationCount > 0 };
      case 'Selected':
        return { ...base, seed: j.selected?.toBase58() ?? me, meta: `Selected ${name(j.selected?.toBase58() ?? '')} · accept by ${date(j.selectedAt + JOB_ACCEPT_WINDOW_SECS)}`, sub: 'locked in the job', status: 'Selected', tone: 'info' as Tone, cta: 'Review applicants', href: applicantsHref, primary: false };
      case 'Filled':
        return { ...base, seed: j.selected?.toBase58() ?? me, meta: `Hired ${name(j.selected?.toBase58() ?? '')} · contract created`, sub: 'moved into the contract', status: 'Filled', tone: 'purple' as Tone, cta: 'Open contract', href: j.fund ? `/contract/${j.fund.toBase58()}` : `/jobs/${j.address.toBase58()}`, primary: false };
      default:
        return { ...base, meta: `${applicants} · budget returned`, sub: 'returned to you', status: 'Withdrawn', tone: 'neutral' as Tone, cta: 'View record', href: `/jobs/${j.address.toBase58()}`, primary: false };
    }
  });
}
