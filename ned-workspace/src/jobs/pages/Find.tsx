// /jobs/find — Find jobs v4 (board WebJobsFind; prompts-hub-v4.md V6; funded-jobs-plan section 6.1): every open listing
// with the segmented search bar (What · Field · Budget), removable filter chips, the Filters sheet, grid or list results,
// and the tabs My applications and My listings. Every filter, the sort, the view and the tab live in the URL
// (filtersToQuery / filtersFromQuery), so a reload or a shared link shows the same page; nothing is stored. Filtering
// stays in @ned/core (filterJobs, sortJobs) and ../find.ts. Listings refresh every 30 s and on focus.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import type { JobApplicationAccount, JobListingAccount } from '@ned/core/jobs/decode.ts';
import { filterJobs, sortJobs, type JobBudget, type JobFilters, type JobSort } from '@ned/core/jobs/search.ts';
import { JOB_CATEGORIES, JOB_SKILLS, categoryById, skillById } from '@ned/core/jobs/taxonomy.ts';
import { Avatar } from '../../components/Avatar.tsx';
import { useChainTime } from '../../hooks/useChainTime.ts';
import { shortAddress } from '../../lib/format.ts';
import { CATEGORY_LOOK } from '../components/categoryLook.ts';
import { Chip, RemovableChip } from '../components/Chip.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { HubButton } from '../components/HubButton.tsx';
import { HubIcon } from '../components/HubIcon.tsx';
import { JobCard, JobRow, JobRowList, type JobMine } from '../components/JobCard.tsx';
import { MoneyText, moneyLabel } from '../components/MoneyText.tsx';
import { Popover } from '../components/Popover.tsx';
import { SectionHeading } from '../components/SectionHeading.tsx';
import { Segmented } from '../components/Segmented.tsx';
import { Sheet } from '../components/Sheet.tsx';
import { Switch } from '../components/Switch.tsx';
import {
  applicationRows,
  BUDGETS,
  budgetCounts,
  budgetLabel,
  budgetValue,
  categoryCounts,
  clearAll,
  clearSheet,
  countLabel,
  DURATIONS,
  filterChips,
  FUNDED_ONLY,
  filtersOn,
  listingRows,
  openJobsCount,
  PAGE_SIZE,
  RANGES,
  sheetCount,
  SHEET_SKILLS,
  viewFromQuery,
  viewToQuery,
  type FindTab,
  type Row,
} from '../find.ts';
import { FEATURES } from '../../config.ts';
import { useDisplayNames, useMyApplications, useMyListings, useOpenJobs } from '../hooks.ts';
import { useHubViewer } from '../JobsLayout.tsx';
import hub from '../hub.module.css';
import styles from './Find.module.css';
import { ERROR_TEXT } from './Overview.tsx';

export const NO_MATCH = 'No open jobs match, yet';

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
      lockAtHire={FEATURES.lockAtHire}
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
  /** v1.4 (D29): the "Funded only" switch and listings that lock when hired; off = the v1.3 board (funded only) */
  lockAtHire?: boolean;
}

const SORTS: { id: JobSort; label: string }[] = [
  { id: 'new', label: 'Newest' },
  { id: 'soon', label: 'Apply by soonest' },
  { id: 'budget', label: 'Highest budget' },
];

type Pop = 'cat' | 'budget' | null;

export function FindView(p: FindViewProps) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const lockAtHire = p.lockAtHire ?? true;
  const { filters: query, tab: wanted } = viewFromQuery(params);
  // Flag off: the v1.3 board shows funded listings only, with no switch
  const f: JobFilters = lockAtHire ? query : { ...query, funded: undefined };
  // Visibility as before: My listings never in the Vietnam view
  const tab: FindTab = p.vn && wanted === 'listings' ? 'open' : wanted;
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pop, setPop] = useState<Pop>(null);
  const [sheet, setSheet] = useState(false);
  const catRef = useRef<HTMLButtonElement>(null);
  const budgetRef = useRef<HTMLButtonElement>(null);
  // The What box writes to the URL 150 ms after the last key (results follow the URL)
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
  const all = lockAtHire ? (p.open ?? []) : (p.open ?? []).filter((j) => !j.unfunded);
  const results = sortJobs(filterJobs(all, f, ctx), f.sort);
  const shown = showAll ? results : results.slice(0, PAGE_SIZE);
  const on = filtersOn(f);
  const chips = filterChips(f, p.vn);
  const more = sheetCount(f);
  const name = (w: string) => p.names[w] ?? shortAddress(w);
  const mine = (j: JobListingAccount): JobMine => (p.me && j.business.toBase58() === p.me ? 'own' : appliedSet.has(j.address.toBase58()) ? 'applied' : null);
  // Only funded listings count as locked (D29)
  const lockedAll = all.reduce((s, j) => (j.unfunded ? s : s + j.total), 0n);
  const list = f.view === 'list';

  const tabs: { id: FindTab; label: string; count: number | null }[] = [
    { id: 'open', label: 'Open jobs', count: p.open ? all.length : null },
    { id: 'applied', label: 'My applications', count: p.signedIn && p.applications ? p.applications.length : null },
    ...(p.vn ? [] : [{ id: 'listings' as const, label: 'My listings', count: p.signedIn && p.listings ? p.listings.length : null }]),
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // clipboard blocked: the address bar still holds the same link
    }
    setCopied(true);
  };

  return (
    <>
      <section aria-labelledby="fj-h1" className={`${hub.container} ${styles.top}`}>
        <div className={`${styles.titleRow} hb-in`}>
          <SectionHeading id="fj-h1" level={1} size="page" title={lockAtHire ? 'Find jobs · ' : 'Find jobs, '} tone={lockAtHire ? 'budget locked before you accept' : 'already funded'} />
          <p className={styles.summary} data-testid="find-summary">
            {p.open ? (
              <>
                <strong>{all.length}</strong> open {all.length === 1 ? 'job' : 'jobs'} · <strong>{moneyLabel(lockedAll, p.vn)}</strong> locked on Solana
              </>
            ) : (
              'Reading jobs from Solana…'
            )}
          </p>
        </div>
        <div role="tablist" aria-label="Jobs view" className={`${styles.tabs} hb-in-2`}>
          {tabs.map((t) => {
            const sel = tab === t.id;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={sel} className={`${styles.tab} ${sel ? styles.tabOn : ''}`} onClick={() => go(f, t.id)}>
                {t.label}
                {t.count !== null ? <span className={styles.badge}>{t.count}</span> : null}
              </button>
            );
          })}
        </div>
      </section>

      {tab === 'open' ? (
        <>
          <div className={styles.barWrap}>
            <div className={styles.barInner}>
              <div role="search" aria-label="Search jobs" className={`${styles.bar} ${pop ? styles.barOpen : ''} hb-in-3`}>
                <label className={`${styles.seg} ${styles.segWhat}`}>
                  <span className={styles.segLabel}>What</span>
                  <input
                    type="search"
                    aria-label="Search jobs"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onFocus={() => setPop(null)}
                    placeholder="Title, skill or keyword"
                    className={styles.segInput}
                  />
                </label>
                <span aria-hidden className={styles.divider} />
                <button
                  ref={catRef}
                  type="button"
                  className={`${styles.seg} ${pop === 'cat' ? styles.segOn : ''}`}
                  aria-haspopup="dialog"
                  aria-expanded={pop === 'cat'}
                  onClick={() => setPop((cur) => (cur === 'cat' ? null : 'cat'))}
                >
                  <span className={styles.segLabel}>Field</span>
                  <span className={`${styles.segValue} ${f.cat ? '' : styles.segEmpty}`}>
                    {f.cat ? categoryById(f.cat)?.label : 'All fields'}
                    <HubIcon name="chevronDown" size={14} width={2.4} />
                  </span>
                </button>
                <span aria-hidden className={styles.divider} />
                <button
                  ref={budgetRef}
                  type="button"
                  className={`${styles.seg} ${pop === 'budget' ? styles.segOn : ''}`}
                  aria-haspopup="dialog"
                  aria-expanded={pop === 'budget'}
                  onClick={() => setPop((cur) => (cur === 'budget' ? null : 'budget'))}
                >
                  <span className={styles.segLabel}>Budget</span>
                  <span className={`${styles.segValue} ${budgetValue(f, p.vn) ? '' : styles.segEmpty}`}>
                    {budgetValue(f, p.vn) ?? 'Any budget'}
                    <HubIcon name="chevronDown" size={14} width={2.4} />
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.go}
                  aria-label="Search"
                  onClick={() => {
                    setPop(null);
                    if ((f.q ?? '') !== q.trim()) go({ ...f, q: q.trim() || undefined });
                  }}
                >
                  <HubIcon name="search" size={18} width={2.4} />
                </button>
              </div>
              <Popover open={pop === 'cat'} onClose={() => setPop(null)} anchorRef={catRef} label="Choose a field" width={520} className={styles.popField}>
                <FieldOptions all={all} f={f} ctx={ctx} onPick={(cat) => {
                  setPop(null);
                  go({ ...f, cat });
                }} />
              </Popover>
              <Popover open={pop === 'budget'} onClose={() => setPop(null)} anchorRef={budgetRef} label="Choose a budget" width={340} align="end" className={styles.popBudget}>
                <BudgetOptions all={all} f={f} ctx={ctx} vn={p.vn} onPick={(budget) => {
                  setPop(null);
                  go({ ...f, budget, min: undefined, max: undefined });
                }} />
              </Popover>
            </div>
          </div>

          <section aria-label="Results" className={`${hub.container} ${styles.results}`}>
            <div className={styles.toolbar}>
              <button type="button" className={styles.filtersButton} aria-haspopup="dialog" onClick={() => setSheet(true)}>
                <HubIcon name="sliders" size={15} />
                Filters
                {more ? (
                  <span className={styles.filtersBadge} aria-label={`${more} on`}>
                    {more}
                  </span>
                ) : null}
              </button>
              {chips.map((c) => (
                <RemovableChip key={c.key} label={c.label} onRemove={() => go(c.without)} />
              ))}
              {chips.length ? (
                <button type="button" className={`${styles.textButton} hb-ul`} onClick={() => go(clearAll(f))}>
                  Clear all
                </button>
              ) : null}
              <span className={styles.grow} />
              <span aria-live="polite" className={styles.count} data-testid="result-count">
                {p.open ? countLabel(results.length, on) : 'Reading jobs…'}
              </span>
              <label className={styles.sort}>
                Sort
                <select value={f.sort ?? 'new'} onChange={(e) => go({ ...f, sort: e.target.value as JobSort })}>
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <Segmented
                label="Layout"
                mode="toggle"
                value={list ? 'list' : 'grid'}
                onChange={(v) => go({ ...f, view: v === 'list' ? 'list' : undefined })}
                options={[
                  { value: 'grid', name: 'Grid', label: <HubIcon name="grid" size={15} /> },
                  { value: 'list', name: 'List', label: <HubIcon name="list" size={15} /> },
                ]}
              />
              <button
                type="button"
                className={`${styles.share} ${copied ? styles.shareDone : ''}`}
                aria-label={copied ? 'Link to this search copied' : 'Copy a link to this search'}
                title={copied ? 'Link to this search copied' : 'Copy a link to this search'}
                onClick={() => void copyLink()}
              >
                <HubIcon name="share" size={15} />
                {copied ? 'Copied' : 'Share'}
              </button>
            </div>

            {p.openError ? (
              <div className={styles.error} role="alert">
                {ERROR_TEXT}
                <HubButton variant="white" size="small" onClick={p.onRetry}>
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
                {list ? (
                  <div className={styles.listWrap}>
                    <JobRowList>
                      {shown.map((j) => (
                        <JobRow key={j.address.toBase58()} job={j} vn={p.vn} now={p.now} businessName={name(j.business.toBase58())} mine={mine(j)} />
                      ))}
                    </JobRowList>
                  </div>
                ) : (
                  <div className={styles.grid}>
                    {shown.map((j) => (
                      <JobCard key={j.address.toBase58()} job={j} vn={p.vn} now={p.now} businessName={name(j.business.toBase58())} mine={mine(j)} />
                    ))}
                  </div>
                )}
                {results.length > PAGE_SIZE ? (
                  <div className={styles.moreRow}>
                    <HubButton variant="dark" onClick={() => setShowAll(!showAll)} style={{ height: 46 }}>
                      {showAll ? 'Show fewer jobs' : `Show all ${results.length} jobs`}
                    </HubButton>
                  </div>
                ) : null}
              </>
            ) : (
              <div className={styles.noMatch} role="status">
                <div className={styles.noMatchTitle}>
                  {on || all.length ? (
                    <>
                      No open jobs match, <span className={styles.noMatchTone}>yet</span>
                    </>
                  ) : (
                    'No open jobs yet'
                  )}
                </div>
                <div className={styles.noMatchBody}>
                  {on ? 'Try another field, a wider budget, or fewer filters.' : 'New jobs show up here as soon as a business locks a budget.'}
                </div>
                {on ? (
                  <HubButton variant="dark" onClick={() => go(clearAll(f))} className={styles.noMatchButton}>
                    Clear all filters
                  </HubButton>
                ) : null}
              </div>
            )}
          </section>

          <Sheet
            open={sheet}
            onClose={() => setSheet(false)}
            title="Filters"
            footer={
              <>
                <button type="button" className={`${styles.clearThese} hb-ul`} onClick={() => go(clearSheet(f))}>
                  Clear these
                </button>
                <HubButton variant="dark" onClick={() => setSheet(false)} style={{ height: 48, fontSize: 15 }}>
                  Show {results.length === 1 ? '1 job' : `${results.length} jobs`}
                </HubButton>
              </>
            }
          >
            <SheetFilters f={f} go={go} signedIn={p.signedIn} lockAtHire={lockAtHire} />
          </Sheet>
        </>
      ) : !p.signedIn ? (
        <section className={`${hub.container} ${styles.rowsSection}`}>
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
        </section>
      ) : (
        <section aria-label={tab === 'applied' ? 'My applications' : 'My listings'} className={`${hub.container} ${styles.rowsSection}`}>
          <p className={styles.rowsSub}>{tab === 'applied' ? 'Where each of your applications stands.' : 'Jobs you posted and what happened to each budget.'}</p>
          <Rows
            rows={tab === 'applied' ? (p.applications ? applicationRows(p.applications, p.me!, name, p.now) : null) : p.listings ? listingRows(p.listings, p.me!, name) : null}
            vn={p.vn}
            empty={
              tab === 'applied'
                ? { title: "You haven't applied to a job yet", body: 'Every open job shows its locked budget, so the money is there before you apply.' }
                : { title: "You haven't posted a job yet", body: 'Post a job: lock its budget and publish it.' }
            }
          />
        </section>
      )}
    </>
  );
}

type Ctx = { now: number; applied: ReadonlySet<string> };

/** V6.3 Field: "All fields" and the eight categories, two columns, live counts (every other filter applied) */
function FieldOptions({ all, f, ctx, onPick }: { all: JobListingAccount[]; f: JobFilters; ctx: Ctx; onPick(cat: string | undefined): void }) {
  const counts = categoryCounts(all, f, ctx, JOB_CATEGORIES.map((c) => c.id));
  const options = [
    { id: '', label: 'All fields', n: counts.all, icon: 'grid' as const, ink: '#16161C', tint: '#F5F5F7' },
    ...JOB_CATEGORIES.map((c) => {
      const look = CATEGORY_LOOK[c.index] ?? CATEGORY_LOOK[CATEGORY_LOOK.length - 1];
      return { id: c.id, label: c.label, n: counts.byId[c.id], icon: look.icon, ink: look.ink, tint: look.tint };
    }),
  ];
  return (
    <div className={styles.fieldGrid}>
      {options.map((o) => {
        const sel = (f.cat ?? '') === o.id;
        return (
          <button key={o.id || 'all'} type="button" aria-pressed={sel} className={`${styles.fieldOption} ${sel ? styles.optionOn : ''}`} onClick={() => onPick(o.id || undefined)}>
            <span className={styles.fieldIcon} style={{ background: o.tint }}>
              <HubIcon name={o.icon} size={17} width={2} color={o.ink} />
            </span>
            <span className={styles.optionText}>
              <span className={styles.optionLabel}>{o.label}</span>
              <span className={styles.optionCount}>{openJobsCount(o.n)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** V6.3 Budget: radio rows with live counts; ≈ VND ranges in the Vietnam view */
function BudgetOptions({ all, f, ctx, vn, onPick }: { all: JobListingAccount[]; f: JobFilters; ctx: Ctx; vn: boolean; onPick(b: JobBudget | undefined): void }) {
  const counts = budgetCounts(all, f, ctx);
  const custom = !f.budget && (f.min !== undefined || f.max !== undefined);
  const options = [{ id: '' as const, label: 'Any budget', n: counts.any }, ...BUDGETS.map((b) => ({ id: b.id, label: budgetLabel(b.id, vn), n: counts.byId[b.id] }))];
  return (
    <div role="radiogroup" aria-label="Budget">
      {options.map((o) => {
        const sel = o.id ? f.budget === o.id : !f.budget && !custom;
        return (
          <button key={o.id || 'any'} type="button" role="radio" aria-checked={sel} className={styles.budgetOption} onClick={() => onPick(o.id || undefined)}>
            <span className={`${styles.radio} ${sel ? styles.radioOn : ''}`} aria-hidden />
            <span className={styles.optionText}>
              <span className={styles.optionLabel}>{o.label}</span>
              <span className={styles.optionCount}>{openJobsCount(o.n)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** V6.4 the Filters sheet body; every change writes the URL at once */
function SheetFilters({ f, go, signedIn, lockAtHire }: { f: JobFilters; go(next: JobFilters): void; signedIn: boolean; lockAtHire: boolean }) {
  const cat = f.cat ? categoryById(f.cat) : undefined;
  const ids = cat ? JOB_SKILLS.filter((k) => k.category === cat.index).map((k) => k.id) : SHEET_SKILLS;
  const picked = f.skills ?? [];
  const skillIds = [...ids, ...picked.filter((id) => !ids.includes(id))];
  const toggle = (id: string) => {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
    go({ ...f, skills: next.length ? next : undefined });
  };
  return (
    <>
      <SheetSection title="Skills" sub="Show jobs that ask for any of these.">
        <div className={styles.skillPills}>
          {skillIds.map((id) => {
            const sel = picked.includes(id);
            return (
              <button key={id} type="button" aria-pressed={sel} className={`${styles.skillPill} ${sel ? styles.skillOn : ''}`} onClick={() => toggle(id)}>
                {skillById(id)?.label ?? id}
              </button>
            );
          })}
        </div>
      </SheetSection>
      <SheetSection title="Time to deliver">
        <Segmented
          label="Time to deliver"
          value={f.dur ?? 'any'}
          onChange={(v) => go({ ...f, dur: v === 'any' ? undefined : v })}
          options={[{ value: 'any' as const, label: 'Any' }, ...DURATIONS.map((d) => ({ value: d.id, label: d.label }))]}
        />
      </SheetSection>
      <SheetSection title="Milestones">
        <Segmented
          label="Milestones"
          value={f.ms ?? 'any'}
          onChange={(v) => go({ ...f, ms: v === 'any' ? undefined : v })}
          options={[{ value: 'any' as const, label: 'Any' }, ...RANGES.map((r) => ({ value: r.id, label: r.label }))]}
        />
      </SheetSection>
      <section className={styles.sheetSwitches}>
        <Switch checked={Boolean(f.soon)} onChange={(v) => go({ ...f, soon: v || undefined })} label="Apply by within 24 hours" sub="Jobs that close soon" />
        {signedIn ? <Switch checked={Boolean(f.hide)} onChange={(v) => go({ ...f, hide: v || undefined })} label="Hide jobs I applied to" sub="Keep your list fresh" /> : null}
        {lockAtHire ? (
          <Switch checked={Boolean(f.funded)} onChange={(v) => go({ ...f, funded: v || undefined })} label={FUNDED_ONLY} sub="Only jobs with the budget already locked" />
        ) : null}
      </section>
    </>
  );
}

function SheetSection({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className={styles.sheetSection}>
      <h3 className={styles.sheetH3}>{title}</h3>
      {sub ? <p className={styles.sheetSub}>{sub}</p> : null}
      <div className={styles.sheetBody}>{children}</div>
    </section>
  );
}

/** V6.6: My applications / My listings rows in one hairline box */
function Rows({ rows, vn, empty }: { rows: Row[] | null; vn: boolean; empty: { title: string; body: string } }) {
  if (!rows)
    return (
      <div className={styles.rows} aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.skeletonRow} />
        ))}
      </div>
    );
  if (!rows.length)
    return (
      <div className={styles.rows}>
        <div className={styles.rowsEmpty}>
          <div className={styles.rowsEmptyTitle}>{empty.title}</div>
          <div className={styles.rowsEmptyBody}>{empty.body}</div>
        </div>
      </div>
    );
  return (
    <ul className={styles.rows}>
      {rows.map((r) => (
        <li key={r.key} className={`${styles.row} rv`} data-testid="my-row">
          <Avatar seed={r.seed} size={40} decorative />
          <span className={styles.rowMain}>
            <span className={styles.rowTitle}>{r.title}</span>
            <span className={styles.rowMeta}>{r.meta}</span>
          </span>
          <span className={styles.rowMoney}>
            <MoneyText units={r.units} vn={vn} sub={r.sub} size={14} />
          </span>
          <Chip tone={r.tone}>{r.status}</Chip>
          <HubButton variant={r.primary ? 'purple' : 'ghost'} size="small" to={r.href} className={r.primary ? '' : styles.rowCta}>
            {r.cta}
          </HubButton>
        </li>
      ))}
    </ul>
  );
}
