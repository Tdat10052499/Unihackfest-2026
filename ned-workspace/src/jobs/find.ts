// Find jobs v4 (prompts-hub-v4.md V6; appendix H.15 for the rows): the URL ↔ view state, the budget presets, the
// filter chips and counts, and the rows of the two "My" tabs. Pure: no React, no RPC. Filtering stays in @ned/core.
import type { JobApplicationAccount, JobListingAccount } from '@ned/core/jobs/decode.ts';
import { JOB_ACCEPT_WINDOW_SECS } from '@ned/core/jobs/layout.ts';
import {
  filterJobs,
  filtersFromQuery,
  filtersToQuery,
  JOB_BUDGETS,
  type FilterContext,
  type JobBudget,
  type JobDuration,
  type JobFilters,
  type JobMilestoneRange,
  type JobTab,
} from '@ned/core/jobs/search.ts';
import { categoryById, skillById } from '@ned/core/jobs/taxonomy.ts';
import { formatDeadline, vndFromUnits } from '@ned/core/milestone/format.ts';

export type FindTab = JobTab;
export const PAGE_SIZE = 9;

/** View state from the URL: the core filters (with view) and the tab, which the page reads apart */
export function viewFromQuery(query: string | URLSearchParams): { filters: JobFilters; tab: FindTab } {
  const { tab, ...filters } = filtersFromQuery(query);
  return { filters, tab: tab ?? 'open' };
}

/** URL query for a view, in the core's fixed key order (q, cat, budget, skills, …, sort, view, tab) */
export const viewToQuery = (filters: JobFilters, tab: FindTab): string => filtersToQuery({ ...filters, tab });

/** Filters that narrow the results (sort and view do not) */
export const filtersOn = (f: JobFilters) =>
  Boolean(f.q || f.cat || f.budget || f.skills?.length || f.min !== undefined || f.max !== undefined || f.dur || f.ms || f.soon || f.hide || f.funded);

/** Only the filters of the Filters sheet: skills, time to deliver, milestones, the switches (the button's badge) */
export const sheetCount = (f: JobFilters) => (f.skills?.length ?? 0) + (f.dur ? 1 : 0) + (f.ms ? 1 : 0) + (f.soon ? 1 : 0) + (f.hide ? 1 : 0) + (f.funded ? 1 : 0);
export const clearSheet = (f: JobFilters): JobFilters => ({ ...f, skills: undefined, dur: undefined, ms: undefined, soon: undefined, hide: undefined, funded: undefined });
/** Clear all keeps the sort and the grid / list choice */
export const clearAll = (f: JobFilters): JobFilters => ({ sort: f.sort, view: f.view });

export const BUDGETS = JOB_BUDGETS;
const vnd = (usdc: number) => vndFromUnits(BigInt(usdc) * 1_000_000n).toLocaleString('en-US');
/** "Under 20 USDC", or the ≈ VND range of the same amounts in the Vietnam view */
export function budgetLabel(id: JobBudget, vn: boolean): string {
  if (id === 'lt20') return vn ? `Under ≈ ${vnd(20)} VND` : 'Under 20 USDC';
  if (id === '20to50') return vn ? `≈ ${vnd(20)} – ${vnd(50)} VND` : '20 – 50 USDC';
  return vn ? `Over ≈ ${vnd(50)} VND` : 'Over 50 USDC';
}
/** The budget segment's value: the preset, an older min / max link, or "Any budget" */
export function budgetValue(f: JobFilters, vn: boolean): string | null {
  if (f.budget) return budgetLabel(f.budget, vn);
  if (f.min !== undefined || f.max !== undefined) return 'Custom budget';
  return null;
}

export const DURATIONS: { id: JobDuration; label: string; chip: string }[] = [
  { id: '1w', label: '1 week', chip: 'Up to 1 week' },
  { id: '2w', label: '2 weeks', chip: 'Up to 2 weeks' },
  { id: '1m', label: '1 month', chip: 'Up to 1 month' },
];
export const RANGES: { id: JobMilestoneRange; label: string; chip: string }[] = [
  { id: '1', label: '1', chip: '1 milestone' },
  { id: '2-3', label: '2–3', chip: '2–3 milestones' },
  { id: '4-5', label: '4–5', chip: '4–5 milestones' },
];
/** The board's skill pills when no field is chosen (taxonomy ids); with a field, its own skills */
export const SHEET_SKILLS = ['logo-brand', 'ui-ux', 'illustration', 'figma', 'frontend', 'backend', 'mobile', 'solana', 'en-vi', 'copywriting', 'social-media', 'motion', 'video-editing', 'spreadsheets'];

/** v1.4 (D29) switch and chip label: hides listings that lock when hired */
export const FUNDED_ONLY = 'Funded only';

export interface FilterChip {
  key: string;
  label: string;
  /** The filters without this one */
  without: JobFilters;
}

/** One removable chip per active filter (V6.4), in the board's order; the search text stays in the What box */
export function filterChips(f: JobFilters, vn: boolean): FilterChip[] {
  const out: FilterChip[] = [];
  const cat = f.cat ? categoryById(f.cat) : undefined;
  if (cat) out.push({ key: 'cat', label: cat.label, without: { ...f, cat: undefined } });
  const budget = budgetValue(f, vn);
  if (budget) out.push({ key: 'budget', label: budget, without: { ...f, budget: undefined, min: undefined, max: undefined } });
  for (const id of f.skills ?? []) {
    const k = skillById(id);
    if (k) out.push({ key: `skill-${id}`, label: k.label, without: { ...f, skills: f.skills!.filter((x) => x !== id) } });
  }
  if (f.dur) out.push({ key: 'dur', label: DURATIONS.find((d) => d.id === f.dur)!.chip, without: { ...f, dur: undefined } });
  if (f.ms) out.push({ key: 'ms', label: RANGES.find((r) => r.id === f.ms)!.chip, without: { ...f, ms: undefined } });
  if (f.soon) out.push({ key: 'soon', label: 'Apply by within 24 h', without: { ...f, soon: undefined } });
  if (f.hide) out.push({ key: 'hide', label: 'Hiding applied', without: { ...f, hide: undefined } });
  if (f.funded) out.push({ key: 'funded', label: FUNDED_ONLY, without: { ...f, funded: undefined } });
  return out.map((c) => ({ ...c, without: { ...c.without, skills: c.without.skills?.length ? c.without.skills : undefined } }));
}

/** Open jobs that pass every filter except the category (Field popover counts), per category id and in total */
export function categoryCounts(jobs: readonly JobListingAccount[], f: JobFilters, ctx: FilterContext, ids: readonly string[]) {
  const rest = filterJobs(jobs, { ...f, cat: undefined }, ctx);
  const byId: Record<string, number> = {};
  for (const id of ids) byId[id] = filterJobs(rest, { cat: id }, ctx).length;
  return { all: rest.length, byId };
}

/** Open jobs that pass every filter except the budget (Budget popover counts), per preset and for any budget */
export function budgetCounts(jobs: readonly JobListingAccount[], f: JobFilters, ctx: FilterContext) {
  const rest = filterJobs(jobs, { ...f, budget: undefined, min: undefined, max: undefined }, ctx);
  const byId = Object.fromEntries(BUDGETS.map((b) => [b.id, filterJobs(rest, { budget: b.id }, ctx).length])) as Record<JobBudget, number>;
  return { any: rest.length, byId };
}

export const openJobsCount = (n: number) => (n === 1 ? '1 open job' : `${n} open jobs`);
/** "12 jobs", or "3 jobs match" while a filter is on */
export const countLabel = (n: number, on: boolean) => `${n === 1 ? '1 job' : `${n} jobs`}${on ? ' match' : ''}`;

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
    const base = { key: a.address.toBase58(), seed: j.business.toBase58(), title: j.title, units: j.total, sub: j.unfunded ? 'test USDC, locks when hired' : 'test USDC, locked' };
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
    if (j.state === 'Withdrawn') return [{ ...base, meta: `${biz} · applied ${date(a.createdAt)} · ${j.unfunded ? 'withdrawn, nothing was locked' : 'budget returned to the business'}`, status: 'Closed', tone: 'neutral', cta: 'View job', href: jobHref, primary: false }];
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
        return { ...base, meta: `${applicants} · select by ${date(j.selectBy)} · posted ${date(j.createdAt)}`, sub: j.unfunded ? 'locks when you select' : 'locked in the job', status: 'Open', tone: 'success' as Tone, cta: 'Review applicants', href: applicantsHref, primary: j.applicationCount > 0 };
      case 'Selected':
        return { ...base, seed: j.selected?.toBase58() ?? me, meta: `Selected ${name(j.selected?.toBase58() ?? '')} · accept by ${date(j.selectedAt + JOB_ACCEPT_WINDOW_SECS)}`, sub: 'locked in the job', status: 'Selected', tone: 'info' as Tone, cta: 'Review applicants', href: applicantsHref, primary: false };
      case 'Filled':
        return { ...base, seed: j.selected?.toBase58() ?? me, meta: `Hired ${name(j.selected?.toBase58() ?? '')} · contract created`, sub: 'moved into the contract', status: 'Filled', tone: 'purple' as Tone, cta: 'Open contract', href: j.fund ? `/contract/${j.fund.toBase58()}` : `/jobs/${j.address.toBase58()}`, primary: false };
      default:
        return { ...base, meta: `${applicants} · ${j.unfunded ? 'nothing was locked' : 'budget returned'}`, sub: j.unfunded ? 'nothing was locked' : 'returned to you', status: 'Withdrawn', tone: 'neutral' as Tone, cta: 'View record', href: `/jobs/${j.address.toBase58()}`, primary: false };
    }
  });
}
