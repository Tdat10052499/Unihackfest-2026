// /jobs — Overview of N.E.D Jobs (WebJobs board; appendix H.12–H.14). Every number comes from the open listings read
// from Solana: their count, the sum of their locked budgets, their applicant counts and their categories.
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import type { JobListingAccount } from '@ned/core/jobs/decode.ts';
import { filtersToQuery } from '@ned/core/jobs/search.ts';
import { categoryLabel, JOB_CATEGORIES } from '@ned/core/jobs/taxonomy.ts';
import { Avatar } from '../../components/Avatar.tsx';
import { useWalletPanel } from '../../components/WalletPanelContext.tsx';
import { useChainTime } from '../../hooks/useChainTime.ts';
import { shortAddress } from '../../lib/format.ts';
import { BudgetLockedChip } from '../components/Chip.tsx';
import { CategoryTile } from '../components/CategoryTile.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { HubButton } from '../components/HubButton.tsx';
import { HubIcon, type HubIconName } from '../components/HubIcon.tsx';
import { durationLabel, JobCard, type JobMine } from '../components/JobCard.tsx';
import { moneyLabel } from '../components/MoneyText.tsx';
import { SectionHeading } from '../components/SectionHeading.tsx';
import { StepsBand } from '../components/StepsBand.tsx';
import { useAppliedJobs, useDisplayNames, useOpenJobs } from '../hooks.ts';
import { useHubViewer } from '../JobsLayout.tsx';
import { overviewStats } from '../overview.ts';
import hub from '../hub.module.css';
import styles from './Overview.module.css';

/** Popular skills under the search box (taxonomy ids) */
export const POPULAR_SKILLS = [
  { id: 'logo-brand', label: 'Logo & brand' },
  { id: 'figma', label: 'Figma' },
  { id: 'en-vi', label: 'English ↔ Vietnamese' },
  { id: 'solana', label: 'Solana programs' },
];

export const COPY = {
  freelancer: {
    title: 'Find work that is already funded',
    sub: 'Every job here has its full budget locked on Solana before it is posted. Apply with a short pitch; if you are hired, you receive VND milestone by milestone.',
  },
  client: {
    title: 'Hire for work you can fund today',
    sub: 'Browse what others post, or post your own job with its budget locked. Pick one applicant and the contract is created for you.',
  },
};

export const ERROR_TEXT = "Couldn't read jobs from Solana. Try again.";

export function Overview() {
  const viewer = useHubViewer();
  const jobs = useOpenJobs();
  const applied = useAppliedJobs(viewer.wallet);
  const now = useChainTime();
  const businesses = (jobs.data ?? []).slice(0, 12).map((j) => j.business.toBase58());
  const names = useDisplayNames(businesses).data ?? {};
  const { openWalletAt } = useWalletPanel();
  return (
    <OverviewView
      jobs={jobs.data ?? null}
      loading={jobs.isPending}
      error={jobs.isError && !jobs.data}
      onRetry={() => void jobs.refetch()}
      vn={viewer.vn}
      client={viewer.signedIn && !viewer.vn}
      signedIn={viewer.signedIn}
      me={viewer.wallet}
      applied={applied.data}
      names={names}
      now={now}
      onRecords={() => openWalletAt('/records')}
    />
  );
}

export interface OverviewViewProps {
  jobs: JobListingAccount[] | null;
  loading: boolean;
  error: boolean;
  onRetry(): void;
  vn: boolean;
  /** Client copy and actions: signed in, outside the Vietnam view */
  client: boolean;
  signedIn: boolean;
  me: string | null;
  applied?: ReadonlySet<string>;
  names: Record<string, string>;
  now: number;
  onRecords(): void;
}

export function OverviewView(p: OverviewViewProps) {
  const stats = overviewStats(p.jobs ?? []);
  const ready = p.jobs !== null;
  const name = (j: JobListingAccount) => p.names[j.business.toBase58()] ?? shortAddress(j.business.toBase58());
  const mine = (j: JobListingAccount): JobMine =>
    p.me && j.business.toBase58() === p.me ? 'own' : p.applied?.has(j.address.toBase58()) ? 'applied' : null;
  const copy = p.client ? COPY.client : COPY.freelancer;

  return (
    <>
      <Hero {...p} stats={stats} ready={ready} copy={copy} businessName={stats.newest ? name(stats.newest) : ''} />
      <div className={`${styles.stepsWrap} ${styles.rise3}`}>
        <StepsBand role={p.client ? 'client' : 'freelancer'} />
      </div>

      <section aria-labelledby="hub-cat" className={styles.section}>
        <SectionHeading id="hub-cat" center title="Choose your field" sub="Open jobs with locked budgets, by category." />
        <div className={styles.tiles}>
          {JOB_CATEGORIES.map((c) => (
            <CategoryTile key={c.id} category={c.index} count={stats.byCategory[c.index]} loading={!ready} />
          ))}
        </div>
      </section>

      <section id="featured" aria-labelledby="hub-feat" className={styles.featured}>
        <div className={`${hub.container} ${styles.featuredInner}`}>
          <SectionHeading
            id="hub-feat"
            center
            title="Featured jobs"
            sub={<span className={styles.featuredSub}>The newest jobs, each with its budget already locked. Find jobs lists every job, with filters.</span>}
          />
          {p.error ? (
            <div className={styles.error} role="alert">
              {ERROR_TEXT}
              <HubButton variant="outline" size="small" onClick={p.onRetry}>
                <HubIcon name="refresh" size={14} />
                Retry
              </HubButton>
            </div>
          ) : p.loading || !ready ? (
            <div className={styles.grid} aria-busy="true" aria-label="Loading jobs">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className={`${styles.skeleton} ${i === 0 ? styles.skeletonDark : ''}`} data-testid="job-skeleton" />
              ))}
            </div>
          ) : stats.featured.length ? (
            <div className={styles.grid}>
              {stats.featured.map((j, i) => (
                <JobCard key={j.address.toBase58()} job={j} vn={p.vn} now={p.now} dark={i === 0} businessName={name(j)} mine={mine(j)} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No open jobs yet"
              body={p.client ? 'Post the first one: lock a budget and publish it.' : 'New jobs show up here as soon as a business locks a budget.'}
              action={p.client ? <HubButton variant="dark" to="/jobs/new">Post a job</HubButton> : undefined}
            />
          )}
          <HubButton variant="dark" size="large" to="/jobs/find" className={styles.more}>
            Find more jobs
            <HubIcon name="arrowRight" size={15} />
          </HubButton>
        </div>
      </section>

      <Why client={p.client} vn={p.vn} signedIn={p.signedIn} onRecords={p.onRecords} />
    </>
  );
}

function Hero(p: OverviewViewProps & { stats: ReturnType<typeof overviewStats>; ready: boolean; copy: { title: string; sub: string }; businessName: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const query = filtersToQuery({ q, ...(cat ? { cat } : {}) });
    navigate(query ? `/jobs/find?${query}` : '/jobs/find');
  };
  const { stats } = p;
  const newest = stats.newest;
  const longest = newest ? Math.max(0, ...newest.milestones.map((m) => m.workSecs)) : 0;
  const floats: { icon: HubIconName; color: string; style: React.CSSProperties; cls: string }[] = [
    { icon: 'design', color: '#7B2FBE', style: { left: '6%', top: '52%' }, cls: hub.float },
    { icon: 'development', color: '#E5582E', style: { left: '22%', top: '16%' }, cls: hub.float2 },
    { icon: 'writing', color: '#127A3A', style: { right: '4%', top: '30%' }, cls: hub.float },
    { icon: 'video', color: '#3730A3', style: { right: '14%', bottom: '8%' }, cls: hub.float2 },
  ];
  return (
    <section aria-labelledby="hub-h1" className={styles.hero}>
      <div className={`${hub.container} ${styles.heroInner}`}>
        <div className={`${styles.heroText} ${styles.rise}`}>
          <span className={styles.eyebrow}>
            <HubIcon name="lock" size={14} width={2.4} />
            Every budget is locked before the job is posted
          </span>
          <h1 id="hub-h1" className={styles.h1}>
            {p.copy.title}
          </h1>
          <p className={styles.lead}>{p.copy.sub}</p>
          <form role="search" aria-label="Search jobs" className={styles.search} onSubmit={submit}>
            <label className={styles.field}>
              Keyword
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Logo, Framer, translation…" />
            </label>
            <span aria-hidden className={styles.searchRule} />
            <label className={`${styles.field} ${styles.fieldNarrow}`}>
              Category
              <select value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="">All categories</option>
                {JOB_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <HubButton variant="dark" size="large" type="submit">
              <HubIcon name="search" size={16} width={2.4} />
              Search
            </HubButton>
          </form>
          <div className={styles.popular}>
            <span className={styles.popularLabel}>Popular:</span>
            {POPULAR_SKILLS.map((s) => (
              <Link key={s.id} to={`/jobs/find?${filtersToQuery({ skills: [s.id] })}`} className={styles.popularLink}>
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        <div className={`${styles.art} ${styles.rise2}`} aria-hidden>
          <div className={styles.artBox}>
            <svg viewBox="0 0 480 480" className={styles.artSvg}>
              <circle cx="240" cy="250" r="178" fill="#DCC9F7" />
              <circle cx="240" cy="250" r="128" fill="#D0B7F3" />
              <path d="M40 300C120 120 330 60 440 170" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
              <path d="M70 140C190 210 300 420 450 360" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            </svg>
            {floats.map((f) => (
              <span key={f.icon} className={`${styles.floatIcon} ${f.cls}`} style={f.style}>
                <HubIcon name={f.icon} size={20} width={2} color={f.color} />
              </span>
            ))}
            <div className={styles.heroCard} data-testid="hero-card">
              {newest ? (
                <>
                  <div className={styles.heroCardTop}>
                    <Avatar seed={newest.business.toBase58()} size={28} decorative />
                    <span className={styles.heroCardBiz}>{p.businessName}</span>
                    <span className={styles.heroCardChip}>
                      <BudgetLockedChip />
                    </span>
                  </div>
                  <div className={styles.heroCardTitle}>{newest.title}</div>
                  <div className={styles.heroCardMeta}>
                    {categoryLabel(newest.category)} · {newest.milestoneCount === 1 ? '1 milestone' : `${newest.milestoneCount} milestones`} · up to {durationLabel(longest)}
                  </div>
                  <div className={styles.heroCardFoot}>
                    <span className={styles.heroCardMoney}>{moneyLabel(newest.total, p.vn)}</span>
                    <span className={styles.heroCardApply}>Apply</span>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.heroCardTop}>
                    <span className={styles.heroCardChip}>
                      <BudgetLockedChip />
                    </span>
                  </div>
                  <div className={styles.heroCardTitle}>{p.ready ? 'No open jobs yet' : 'Reading jobs from Solana…'}</div>
                  <div className={styles.heroCardMeta}>The newest open job shows here.</div>
                </>
              )}
            </div>
            <div className={`${styles.statCard} ${hub.float}`} data-testid="locked-card">
              <div className={styles.statMoney}>{p.ready ? moneyLabel(stats.lockedUnits, p.vn) : '…'}</div>
              <div className={styles.statLabel}>locked in {p.ready ? stats.openCount : '…'} open {stats.openCount === 1 ? 'job' : 'jobs'}</div>
              {stats.bars.length ? (
                <div className={styles.bars}>
                  {stats.bars.map((b, i) => (
                    <span key={i} className={`${styles.bar} ${b.high ? styles.barHigh : ''}`} style={{ height: b.height }} />
                  ))}
                </div>
              ) : null}
            </div>
            <div className={`${styles.appsCard} ${hub.float2}`} data-testid="apps-card">
              <span className={styles.appsIcon}>
                <HubIcon name="check" size={14} width={2.4} />
              </span>
              {p.ready ? stats.applications : '…'} {stats.applications === 1 ? 'application' : 'applications'} on open jobs
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const REASONS = (vn: boolean): { icon: HubIconName; label: string }[] => [
  { icon: 'lock', label: 'Budget locked first' },
  { icon: 'data', label: 'Track record from Solana' },
  { icon: 'dollar', label: 'No fee from N.E.D' },
  vn ? { icon: 'cash', label: 'Receive earnings in VND' } : { icon: 'shieldPlain', label: 'Release only accepted work' },
];

function Why({ client, vn, signedIn, onRecords }: { client: boolean; vn: boolean; signedIn: boolean; onRecords(): void }) {
  return (
    <section aria-labelledby="hub-why" className={`${hub.container} ${styles.why}`}>
      <div className={styles.whyArt} aria-hidden>
        <div className={styles.whyBox}>
          <div className={styles.whyCard}>
            <div className={styles.whyCardHead}>Your contract</div>
            <div className={styles.whyRows}>
              <div className={styles.whyRow}>
                <span className={styles.whyDot} style={{ background: '#16A34A' }}>
                  <HubIcon name="check" size={12} width={3} />
                </span>
                <span className={styles.whyRowText}>1 · First milestone</span>
                <span style={{ fontSize: 12, color: '#127A3A' }}>Released</span>
              </div>
              <div className={styles.whyRow}>
                <span className={styles.whyDot} style={{ background: '#7B2FBE' }}>
                  <HubIcon name="lock" size={12} width={2.6} />
                </span>
                <span className={styles.whyRowText}>2 · Final files</span>
                <span style={{ fontSize: 12, color: '#6A22B0' }}>Locked</span>
              </div>
            </div>
          </div>
          <div className={`${styles.whyBadge} ${hub.float}`}>
            <HubIcon name="shield" size={15} color="#127A3A" />
            Checkable on Solana Explorer
          </div>
        </div>
      </div>
      <div className={styles.whyText}>
        <span className={styles.whyMark} aria-hidden>
          <HubIcon name="lock" size={20} />
        </span>
        <h2 id="hub-why" className={styles.whyH2}>
          Funded before anyone applies
        </h2>
        <p className={styles.whyLead}>
          A business can only post a job by locking its whole budget in the program. When it hires you, that budget moves into your contract and is released
          milestone by milestone after the work is accepted.
        </p>
        <ul className={styles.reasons}>
          {REASONS(vn).map((r) => (
            <li key={r.label} className={styles.reason}>
              <span className={styles.reasonIcon} aria-hidden>
                <HubIcon name={r.icon} size={16} />
              </span>
              {r.label}
            </li>
          ))}
        </ul>
        <div className={styles.whyButtons}>
          {client ? (
            <HubButton variant="dark" to="/jobs/new">
              Post a job
              <HubIcon name="arrowRight" size={15} />
            </HubButton>
          ) : (
            <HubButton variant="dark" to="/jobs/find">
              Browse open jobs
              <HubIcon name="arrowRight" size={15} />
            </HubButton>
          )}
          {signedIn ? (
            <HubButton variant="outline" onClick={onRecords}>
              See your records
            </HubButton>
          ) : (
            <HubButton variant="outline" to="/sign-in?next=%2Fjobs">
              See your records
            </HubButton>
          )}
        </div>
      </div>
    </section>
  );
}
