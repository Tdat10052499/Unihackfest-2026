// /jobs/find — every open listing with filters (WebJobsFind board; appendix H.15), plus the tabs My applications and
// My listings. The tab, every filter and the sort live in the URL (filtersToQuery / filtersFromQuery + `tab`), so a
// reload or a shared link shows the same view; nothing is stored. Listings refresh every 30 s and on focus.
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import type { JobApplicationAccount, JobListingAccount } from '@ned/core/jobs/decode.ts';
import { filterJobs, sortJobs, type JobDuration, type JobFilters, type JobMilestoneRange, type JobSort } from '@ned/core/jobs/search.ts';
import { JOB_CATEGORIES, JOB_SKILLS, categoryById } from '@ned/core/jobs/taxonomy.ts';
import { Avatar } from '../../components/Avatar.tsx';
import { useChainTime } from '../../hooks/useChainTime.ts';
import { shortAddress } from '../../lib/format.ts';
import { Chip } from '../components/Chip.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { HubButton } from '../components/HubButton.tsx';
import { HubIcon } from '../components/HubIcon.tsx';
import { JobCard, type JobMine } from '../components/JobCard.tsx';
import { MoneyText } from '../components/MoneyText.tsx';
import {
  applicationRows,
  BUDGETS,
  budgetLabel,
  budgetPreset,
  categoryCounts,
  countLabel,
  filtersOn,
  listingRows,
  PAGE_SIZE,
  viewFromQuery,
  viewToQuery,
  type FindTab,
  type Row,
} from '../find.ts';
import { useDisplayNames, useMyApplications, useMyListings, useOpenJobs } from '../hooks.ts';
import { useHubViewer } from '../JobsLayout.tsx';
import hub from '../hub.module.css';
import styles from './Find.module.css';
import { ERROR_TEXT } from './Overview.tsx';

export const NO_MATCH = 'No open jobs match these filters.';

export function Find() {
  const viewer = useHubViewer();
  const open = useOpenJobs();
  const apps = useMyApplications(viewer.wallet);
  const mine = useMyListings(viewer.wallet);
  const now = useChainTime();
  const wallets = [
    ...(open.data ?? []).map((j) => j.business.toBase58()),
    ...(apps.data ?? []).flatMap((a) => (a.job ? [a.job.business.toBase58()] : [])),
    ...(mine.data ?? []).flatMap((j) => (j.selected ? [j.selected.toBase58()] : [])),
  ];
  const names = useDisplayNames(wallets).data ?? {};
  return (
    <FindView
      open={open.data ?? null}
      openLoading={open.isPending}
      openError={open.isError && !open.data}
      onRetry={() => void open.refetch()}
      applications={viewer.wallet ? (apps.data ?? null) : []}
      listings={viewer.wallet ? (mine.data ?? null) : []}
      signedIn={viewer.signedIn}
      vn={viewer.vn}
      me={viewer.wallet}
      names={names}
      now={now}
    />
  );
}

export interface FindViewProps {
  open: JobListingAccount[] | null;
  openLoading: boolean;
  openError: boolean;
  onRetry(): void;
  /** null while loading */
  applications: { application: JobApplicationAccount; job: JobListingAccount | null }[] | null;
  listings: JobListingAccount[] | null;
  signedIn: boolean;
  vn: boolean;
  me: string | null;
  names: Record<string, string>;
  now: number;
}

const DURATIONS: { id: JobDuration; label: string }[] = [
  { id: '1w', label: 'Up to 1 week' },
  { id: '2w', label: 'Up to 2 weeks' },
  { id: '1m', label: 'Up to 1 month' },
];
const RANGES: { id: JobMilestoneRange; label: string }[] = [
  { id: '1', label: '1 milestone' },
  { id: '2-3', label: '2–3 milestones' },
  { id: '4-5', label: '4–5 milestones' },
];
const SORTS: { id: JobSort; label: string }[] = [
  { id: 'new', label: 'Newest' },
  { id: 'soon', label: 'Apply by soonest' },
  { id: 'budget', label: 'Budget: high to low' },
];

export function FindView(p: FindViewProps) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const { filters: f, tab: wanted } = viewFromQuery(params);
  const tab: FindTab = p.vn && wanted === 'listings' ? 'open' : wanted;
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);
  // The search box writes to the URL 150 ms after the last key (results follow the URL)
  const [q, setQ] = useState(f.q ?? '');
  useEffect(() => setQ(f.q ?? ''), [f.q]);

  const go = (next: JobFilters, nextTab: FindTab = tab) => {
    setShowAll(false);
    setCopied(false);
    setParams(viewToQuery(next, nextTab), { replace: true });
  };
  useEffect(() => {
    if ((f.q ?? '') === q.trim()) return;
    const t = setTimeout(() => go({ ...f, q: q.trim() || undefined }), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const appliedSet = useMemo(() => new Set((p.applications ?? []).map((a) => a.application.job.toBase58())), [p.applications]);
  const ctx = { now: p.now, applied: appliedSet };
  const all = p.open ?? [];
  const results = sortJobs(filterJobs(all, f, ctx), f.sort);
  const shown = showAll ? results : results.slice(0, PAGE_SIZE);
  const counts = categoryCounts(all, f, ctx, JOB_CATEGORIES.map((c) => c.id));
  const on = filtersOn(f);
  const name = (w: string) => p.names[w] ?? shortAddress(w);
  const mine = (j: JobListingAccount): JobMine => (p.me && j.business.toBase58() === p.me ? 'own' : appliedSet.has(j.address.toBase58()) ? 'applied' : null);
  const cat = f.cat ? categoryById(f.cat) : undefined;
  const skillsHere = cat ? JOB_SKILLS.filter((k) => k.category === cat.index) : JOB_SKILLS;
  const skillValue = f.skills?.length === 1 ? f.skills[0] : f.skills?.length ? 'many' : '';
  const budget = budgetPreset(f);

  const tabs: { id: FindTab; label: string; count: number | null }[] = [
    { id: 'open', label: 'Open jobs', count: p.open ? all.length : null },
    { id: 'applied', label: 'My applications', count: p.signedIn && p.applications ? p.applications.length : null },
    ...(p.vn ? [] : [{ id: 'listings' as const, label: 'My listings', count: p.signedIn && p.listings ? p.listings.length : null }]),
  ];
  const title = tab === 'applied' ? 'My applications' : tab === 'listings' ? 'My listings' : cat ? `${cat.label} jobs` : 'Open jobs';
  const sub =
    tab === 'open' ? 'Every budget below is already locked on Solana.' : tab === 'applied' ? 'Where each of your applications stands.' : 'Jobs you posted and what happened to each budget.';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // clipboard blocked: the address bar still holds the same link
    }
    setCopied(true);
  };
  const selectCls = (active: boolean) => `${styles.select} ${active ? styles.selectOn : ''}`;

  return (
    <>
      <section aria-labelledby="fj-h1" className={styles.band}>
        <div className={`${hub.container} ${styles.bandInner}`}>
          <h1 id="fj-h1" className={styles.h1}>
            Find jobs
          </h1>
          <p className={styles.lead}>Every job here has its whole budget locked on Solana. Filter by field, skill, budget and time to deliver.</p>
          <div role="group" aria-label="Category" className={styles.chips}>
            {[{ id: '', label: 'All', n: counts.all }, ...JOB_CATEGORIES.map((c) => ({ id: c.id, label: c.label, n: counts.byId[c.id] }))].map((c) => {
              const active = (f.cat ?? '') === c.id;
              return (
                <button
                  key={c.id || 'all'}
                  type="button"
                  aria-pressed={active}
                  className={`${styles.chip} ${active ? styles.chipOn : ''}`}
                  onClick={() => go({ ...f, cat: c.id || undefined, skills: undefined }, 'open')}
                >
                  {c.label}
                  <span className={styles.count}>{p.open ? c.n : '…'}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section aria-labelledby="fj-board" className={`${hub.container} ${styles.board}`}>
        <div className={styles.head}>
          <div>
            <h2 id="fj-board" className={styles.h2}>
              {title}
            </h2>
            <p className={styles.sub}>{sub}</p>
          </div>
          <div role="tablist" aria-label="Jobs view" className={styles.tabs}>
            {tabs.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`${styles.tab} ${tab === t.id ? styles.tabOn : ''}`} onClick={() => go(f, t.id)}>
                {t.label}
                {t.count !== null ? <span className={styles.count}>{t.count}</span> : null}
              </button>
            ))}
          </div>
        </div>

        {tab === 'open' ? (
          <>
            <div role="group" aria-label="Filters" className={styles.filters}>
              <label className={styles.searchBox}>
                <span className={styles.srOnly}>Search jobs</span>
                <span className={styles.searchIcon}>
                  <HubIcon name="search" size={16} />
                </span>
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, summary, skills" />
              </label>
              <label>
                <span className={styles.srOnly}>Category</span>
                <select className={selectCls(Boolean(f.cat))} value={f.cat ?? ''} onChange={(e) => go({ ...f, cat: e.target.value || undefined, skills: undefined })}>
                  <option value="">All categories</option>
                  {JOB_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={styles.srOnly}>Skill</span>
                <select className={selectCls(Boolean(skillValue))} value={skillValue} onChange={(e) => go({ ...f, skills: e.target.value && e.target.value !== 'many' ? [e.target.value] : undefined })}>
                  <option value="">Any skill</option>
                  {skillValue === 'many' ? <option value="many">{f.skills!.length} skills</option> : null}
                  {skillsHere.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={styles.srOnly}>Budget</span>
                <select
                  className={selectCls(Boolean(budget))}
                  value={budget}
                  onChange={(e) => {
                    const b = BUDGETS.find((x) => x.id === e.target.value);
                    go({ ...f, min: b?.min, max: b?.max });
                  }}
                >
                  <option value="">Any budget</option>
                  {budget === 'custom' ? <option value="custom">Custom budget</option> : null}
                  {BUDGETS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {budgetLabel(b.id, p.vn)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={styles.srOnly}>Time to deliver</span>
                <select className={selectCls(Boolean(f.dur))} value={f.dur ?? ''} onChange={(e) => go({ ...f, dur: (e.target.value || undefined) as JobDuration | undefined })}>
                  <option value="">Any duration</option>
                  {DURATIONS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={styles.srOnly}>Milestones</span>
                <select className={selectCls(Boolean(f.ms))} value={f.ms ?? ''} onChange={(e) => go({ ...f, ms: (e.target.value || undefined) as JobMilestoneRange | undefined })}>
                  <option value="">Any milestones</option>
                  {RANGES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={styles.srOnly}>Sort</span>
                <select className={selectCls(Boolean(f.sort && f.sort !== 'new'))} value={f.sort ?? 'new'} onChange={(e) => go({ ...f, sort: e.target.value as JobSort })}>
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.ticks}>
                <label className={styles.tick}>
                  <input type="checkbox" checked={Boolean(f.soon)} onChange={(e) => go({ ...f, soon: e.target.checked || undefined })} />
                  Apply by within 24 h
                </label>
                <label className={styles.tick}>
                  <input type="checkbox" checked={Boolean(f.hide)} onChange={(e) => go({ ...f, hide: e.target.checked || undefined })} />
                  Hide jobs I applied to
                </label>
                <span className={styles.grow} />
                <span aria-live="polite" className={styles.result} data-testid="result-count">
                  {p.open ? countLabel(results.length, on) : 'Reading jobs from Solana…'}
                </span>
                <button type="button" className={styles.small} onClick={() => go({ sort: f.sort })}>
                  Clear
                </button>
                <button type="button" className={styles.small} onClick={() => void copyLink()}>
                  <HubIcon name="link" size={13} />
                  {copied ? 'Link copied' : 'Copy link'}
                </button>
              </div>
            </div>

            {p.openError ? (
              <div className={styles.error} role="alert">
                {ERROR_TEXT}
                <HubButton variant="outline" size="small" onClick={p.onRetry}>
                  <HubIcon name="refresh" size={14} />
                  Retry
                </HubButton>
              </div>
            ) : !p.open ? (
              <div className={styles.grid} aria-busy="true" aria-label="Loading jobs">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className={styles.skeleton} data-testid="job-skeleton" />
                ))}
              </div>
            ) : results.length ? (
              <>
                <div className={styles.grid}>
                  {shown.map((j, i) => (
                    <JobCard key={j.address.toBase58()} job={j} vn={p.vn} now={p.now} dark={i === 0} businessName={name(j.business.toBase58())} mine={mine(j)} />
                  ))}
                </div>
                {results.length > PAGE_SIZE ? (
                  <HubButton variant="dark" className={styles.more} onClick={() => setShowAll(!showAll)}>
                    {showAll ? 'Show fewer jobs' : `Show all ${results.length} jobs`}
                    <HubIcon name="arrowRight" size={15} />
                  </HubButton>
                ) : null}
              </>
            ) : (
              <div className={styles.noMatch} role="status">
                <span className={styles.noMatchTitle}>{NO_MATCH}</span>
                <span className={styles.noMatchBody}>{all.length ? 'Try another category or a wider budget.' : 'No job is open right now. New jobs show up here as soon as a business locks a budget.'}</span>
                {on ? (
                  <HubButton variant="dark" size="small" onClick={() => go({ sort: f.sort })}>
                    Clear filters
                  </HubButton>
                ) : null}
              </div>
            )}
          </>
        ) : !p.signedIn ? (
          <EmptyState
            icon="lock"
            title={tab === 'applied' ? 'Sign in to see your applications' : 'Sign in to see your listings'}
            body="Your applications and listings are read from Solana for your wallet."
            action={
              <HubButton variant="dark" to={`/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`}>
                Sign in
              </HubButton>
            }
          />
        ) : (
          <Rows
            rows={tab === 'applied' ? (p.applications ? applicationRows(p.applications, p.me!, name, p.now) : null) : p.listings ? listingRows(p.listings, p.me!, name) : null}
            vn={p.vn}
            empty={
              tab === 'applied'
                ? { title: "You haven't applied to a job yet.", body: 'Every open job shows its locked budget, so the money is there before you apply.' }
                : { title: "You haven't posted a job yet.", body: 'Post a job: lock its budget and publish it.' }
            }
          />
        )}
      </section>
    </>
  );
}

function Rows({ rows, vn, empty }: { rows: Row[] | null; vn: boolean; empty: { title: string; body: string } }) {
  if (!rows)
    return (
      <div className={styles.rows} aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.skeletonRow} />
        ))}
      </div>
    );
  if (!rows.length) return <EmptyState title={empty.title} body={empty.body} />;
  return (
    <ul className={styles.rows}>
      {rows.map((r) => (
        <li key={r.key} className={styles.row} data-testid="job-row">
          <Avatar seed={r.seed} size={40} decorative />
          <span className={styles.rowMain}>
            <span className={styles.rowTitle}>{r.title}</span>
            <span className={styles.rowMeta}>{r.meta}</span>
          </span>
          <span className={styles.rowMoney}>
            <MoneyText units={r.units} vn={vn} sub={r.sub} size={14} />
          </span>
          <Chip tone={r.tone}>{r.status}</Chip>
          <HubButton variant={r.primary ? 'purple' : 'outline'} size="small" to={r.href}>
            {r.cta}
          </HubButton>
        </li>
      ))}
    </ul>
  );
}

