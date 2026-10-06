// Search, filter and sort for the job board (funded-jobs-plan.md section 6.1). Pure functions over decoded listings:
// the RPC only filters by state and category; everything else runs in the browser. The URL holds the filters
// (/jobs/find?q=logo&cat=design&skills=figma,logo-brand&min=10&max=100&sort=new), so nothing is saved anywhere.
import type { JobListingAccount } from './decode.ts';
import { categoryById, JOB_CATEGORIES, skillById } from './taxonomy.ts';

export type JobSort = 'new' | 'soon' | 'budget';
export type JobDuration = '1w' | '2w' | '1m';
export type JobMilestoneRange = '1' | '2-3' | '4-5';

export interface JobFilters {
  /** Text in title or summary (case- and accent-insensitive) */
  q?: string;
  /** Category id (taxonomy.ts) */
  cat?: string;
  /** Skill ids; a job matches if it has ANY of them */
  skills?: string[];
  /** Budget range on the total, in whole USDC */
  min?: number;
  max?: number;
  /** Longest milestone work window */
  dur?: JobDuration;
  ms?: JobMilestoneRange;
  /** Apply by within 24 h */
  soon?: boolean;
  /** Hide jobs I applied to (needs `applied` in the context) */
  hide?: boolean;
  sort?: JobSort;
}

export interface FilterContext {
  now: number;
  /** Listing addresses (base58) I applied to */
  applied?: ReadonlySet<string>;
}

const DAY = 86_400;
export const DURATION_SECS: Record<JobDuration, number> = { '1w': 7 * DAY, '2w': 14 * DAY, '1m': 30 * DAY };
const SORTS: readonly JobSort[] = ['new', 'soon', 'budget'];
const DURATIONS = Object.keys(DURATION_SECS) as JobDuration[];
const RANGES: readonly JobMilestoneRange[] = ['1', '2-3', '4-5'];

/** Lower case, no accents (Vietnamese đ included), single spaces */
export function foldText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const inRange = (count: number, r: JobMilestoneRange) => (r === '1' ? count === 1 : r === '2-3' ? count >= 2 && count <= 3 : count >= 4 && count <= 5);
const longestWork = (job: JobListingAccount) => Math.max(0, ...job.milestones.map((m) => m.workSecs));

export function filterJobs<T extends JobListingAccount>(jobs: readonly T[], f: JobFilters, ctx: FilterContext): T[] {
  const words = f.q ? foldText(f.q).split(' ').filter(Boolean) : [];
  const category = f.cat ? categoryById(f.cat) : undefined;
  const skillBits = (f.skills ?? []).map((id) => skillById(id)).filter((k) => k !== undefined).map((k) => 1n << BigInt(k.index));
  return jobs.filter((job) => {
    if (words.length) {
      const text = foldText(`${job.title} ${job.summary}`);
      if (!words.every((w) => text.includes(w))) return false;
    }
    if (category && job.category !== category.index) return false;
    if (skillBits.length && !skillBits.some((bit) => (job.skills & bit) !== 0n)) return false;
    if (f.min !== undefined && job.total < BigInt(Math.round(f.min * 1e6))) return false;
    if (f.max !== undefined && job.total > BigInt(Math.round(f.max * 1e6))) return false;
    if (f.dur && longestWork(job) > DURATION_SECS[f.dur]) return false;
    if (f.ms && !inRange(job.milestoneCount, f.ms)) return false;
    if (f.soon && !(job.applyBy >= ctx.now && job.applyBy - ctx.now <= DAY)) return false;
    if (f.hide && ctx.applied?.has(job.address.toBase58())) return false;
    return true;
  });
}

/** New list, never sorts in place; ties keep the newest first */
export function sortJobs<T extends JobListingAccount>(jobs: readonly T[], sort: JobSort = 'new'): T[] {
  const newest = (a: T, b: T) => b.createdAt - a.createdAt;
  const by: Record<JobSort, (a: T, b: T) => number> = {
    new: newest,
    soon: (a, b) => a.applyBy - b.applyBy || newest(a, b),
    budget: (a, b) => (a.total === b.total ? newest(a, b) : a.total > b.total ? -1 : 1),
  };
  return [...jobs].sort(by[sort]);
}

const num = (v: string | null) => {
  if (v === null || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** URL query → filters; unknown or invalid values are dropped */
export function filtersFromQuery(query: string | URLSearchParams): JobFilters {
  const p = typeof query === 'string' ? new URLSearchParams(query.startsWith('?') ? query.slice(1) : query) : query;
  const f: JobFilters = {};
  const q = p.get('q')?.trim();
  if (q) f.q = q;
  const cat = p.get('cat');
  if (cat && categoryById(cat)) f.cat = cat;
  const skills = (p.get('skills') ?? '').split(',').map((s) => s.trim()).filter((id) => id && skillById(id));
  if (skills.length) f.skills = [...new Set(skills)];
  const min = num(p.get('min'));
  const max = num(p.get('max'));
  if (min !== undefined) f.min = min;
  if (max !== undefined) f.max = max;
  const dur = p.get('dur') as JobDuration | null;
  if (dur && DURATIONS.includes(dur)) f.dur = dur;
  const ms = p.get('ms') as JobMilestoneRange | null;
  if (ms && RANGES.includes(ms)) f.ms = ms;
  if (p.get('soon') === '24h') f.soon = true;
  if (p.get('hide') === 'applied') f.hide = true;
  const sort = p.get('sort') as JobSort | null;
  if (sort && SORTS.includes(sort) && sort !== 'new') f.sort = sort;
  return f;
}

/** Filters → URL query without "?" (fixed key order; defaults left out, so an empty filter gives "") */
export function filtersToQuery(f: JobFilters): string {
  const p = new URLSearchParams();
  if (f.q?.trim()) p.set('q', f.q.trim());
  if (f.cat && categoryById(f.cat)) p.set('cat', f.cat);
  const skills = (f.skills ?? []).filter((id) => skillById(id));
  if (skills.length) p.set('skills', [...new Set(skills)].join(','));
  if (f.min !== undefined) p.set('min', String(f.min));
  if (f.max !== undefined) p.set('max', String(f.max));
  if (f.dur) p.set('dur', f.dur);
  if (f.ms) p.set('ms', f.ms);
  if (f.soon) p.set('soon', '24h');
  if (f.hide) p.set('hide', 'applied');
  if (f.sort && f.sort !== 'new') p.set('sort', f.sort);
  return p.toString().replace(/%2C/g, ',');
}

/** Category tabs in display order: All first, then the 8 categories */
export const CATEGORY_TABS = [{ id: '', label: 'All' }, ...JOB_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))];

