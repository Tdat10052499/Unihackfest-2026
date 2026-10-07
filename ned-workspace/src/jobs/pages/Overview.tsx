// /jobs — Overview of N.E.D Jobs v4 (board WebJobs; prompts-hub-v4.md V5). Every number comes from the open listings
// read from Solana: their count, the sum of their locked budgets, their applicant counts, their categories and the
// newest four with their milestone plans. Readable signed out. Sections, top to bottom: the dusk hero card with its
// notch of live counters (V5.1), trust heading and category circles (V5.2), the six rules (V5.3), the featured split
// (V5.4) and the auto-advancing How-it-works showcase (V5.5); the layout adds the footer with the CTA band (V9).
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import type { JobListingAccount } from '@ned/core/jobs/decode.ts';
import { filtersToQuery } from '@ned/core/jobs/search.ts';
import { categoryLabel, JOB_CATEGORIES } from '@ned/core/jobs/taxonomy.ts';
import { formatDeadline, usdcFromUnits } from '@ned/core/milestone/format.ts';
import { Avatar } from '../../components/Avatar.tsx';
import { useChainTime } from '../../hooks/useChainTime.ts';
import { shortAddress } from '../../lib/format.ts';
import { CATEGORY_LOOK, openJobsLabel } from '../components/categoryLook.ts';
import { ListingBudgetChip } from '../components/Chip.tsx';
import { FEATURES } from '../../config.ts';
import { EmptyState } from '../components/EmptyState.tsx';
import { HubButton } from '../components/HubButton.tsx';
import { HubIcon, type HubIconName } from '../components/HubIcon.tsx';
import { applicantsLabel } from '../components/JobCard.tsx';
import { moneyLabel } from '../components/MoneyText.tsx';
import { Reveal } from '../components/Reveal.tsx';
import { SectionHeading } from '../components/SectionHeading.tsx';
import { StatCounter } from '../components/StatCounter.tsx';
import { useDisplayNames, useOpenJobs } from '../hooks.ts';
import { useHubViewer } from '../JobsLayout.tsx';
import { spanLabel } from '../labels.ts';
import { useAutoAdvance } from '../motion.ts';
import { lockedStatLabel, overviewStats, type OverviewStats } from '../overview.ts';
import hub from '../hub.module.css';
import styles from './Overview.module.css';

export type OverviewAudience = 'guest' | 'vn' | 'client';

type HeroCopy = Record<OverviewAudience, { title: [string, string]; sub: string; link: { label: string; to: string } }>;

/** v1.4 (D29) intro of the hero sub (CL pre-pitch-check 9.3 item 4) */
const LOCKED_BEFORE_ACCEPT =
  'Every job here locks its full budget on Solana before you can accept: at posting, or when the business selects you. Each milestone is released when the client accepts it, or anyone can release it after the review deadline.';

/** V5.1 hero copy per view, v1.4 lock at hire (CL pre-pitch-check 9.3 items 4–5) */
export const HERO: HeroCopy = {
  guest: { title: ['Work with the budget', 'locked before you start'], sub: LOCKED_BEFORE_ACCEPT, link: { label: 'How it works', to: '#hb-how' } },
  vn: { title: ['Work with the budget', 'locked before you start'], sub: `${LOCKED_BEFORE_ACCEPT} VND transfer simulated in this demo.`, link: { label: 'How it works', to: '#hb-how' } },
  client: {
    title: ['Hire with the', 'budget on the table'],
    sub: 'Post a job, lock its budget now or when you hire, pick one applicant, and release each milestone after you accept the work.',
    link: { label: 'Post a job', to: '/jobs/new' },
  },
};

/** V5.1 hero copy per view (board renderVals: guest, Vietnam view, client): v1.3, shown when FEATURES.lockAtHire is off */
export const HERO_V13: HeroCopy = {
  guest: {
    title: ['Work that is', 'already funded'],
    sub: 'Every job here has its full budget locked on Solana before it is posted. If you are hired, you receive your earnings milestone by milestone.',
    link: { label: 'How it works', to: '#hb-how' },
  },
  vn: {
    title: ['Work that is', 'already funded'],
    sub: 'Every job here has its full budget locked on Solana before it is posted. If you are hired, you receive VND milestone by milestone.',
    link: { label: 'How it works', to: '#hb-how' },
  },
  client: {
    title: ['Hire with the', 'budget on the table'],
    sub: 'Post a job with its whole budget locked, pick one applicant, and release each milestone after you accept the work.',
    link: { label: 'Post a job', to: '/jobs/new' },
  },
};

export const TRUST_TEXT =
  'A business locks a job’s whole budget in the program before you can accept: when it posts, or when it selects you. When it hires you, that budget moves into your contract and is released milestone by milestone after the work is accepted.';
export const TRUST_TEXT_V13 =
  'A business can only post a job by locking its whole budget in the program. When it hires you, that budget moves into your contract and is released milestone by milestone after the work is accepted.';

const RULE_LOCKED_V13 = { icon: 'lock' as const, title: 'Budget locked first', text: 'A business can post a job only by locking its whole budget in the program. Anyone can check it on Explorer.' };
const RULE_LOCKED = {
  icon: 'lock' as const,
  title: 'Budget locked before you accept',
  text: 'A business locks the whole budget in the program when it posts, or when it selects you. Anyone can check it on Explorer.',
};

/** V5.3 */
export const RULES: { icon: HubIconName; title: string; text: string }[] = [
  RULE_LOCKED,
  { icon: 'check', title: 'Released per milestone', text: 'Each milestone is released after the client accepts the work, or anyone can release it once the review time ends (unless the client requested changes).' },
  { icon: 'undo', title: 'Request changes, not refunds', text: 'A client who refuses a delivery names what is missing. The amount stays locked; it never goes back alone.' },
  { icon: 'eye', title: 'Preview first, final files after', text: 'Share a watermarked preview to be reviewed. Hand over the final files after release, checked against their fingerprints.' },
  { icon: 'bank', title: 'VND for freelancers in Vietnam', text: 'Choose VND to your bank when you accept, and never hold USDC. The payout partner is simulated in this demo.' },
  { icon: 'data', title: 'Track record from Solana', text: 'Completed contracts and on-time submissions are counted from the chain. No ratings that can be bought.' },
];

/** The Vietnam view never names USDC (section 0). A4: say exactly what holds, without "never hold crypto" (the login
 * wallet signs with test SOL for fees) */
export const rulesFor = (vn: boolean, lockAtHire = true) => {
  const rules = lockAtHire ? RULES : [RULE_LOCKED_V13, ...RULES.slice(1)];
  return vn ? rules.map((r) => ({ ...r, text: r.text.replace('and never hold USDC', 'and the locked amount never passes through your wallet') })) : rules;
};

export interface HowStep {
  role: string;
  title: string;
  text: string;
  note: string;
  mockLabel: string;
  mockTitle: string;
  rows: [string, string][];
  button: string;
  /** purple on-chain button, or the green "Released" state */
  onChain: boolean;
}

/**
 * V5.5 steps. The mock amounts are fixed examples; the Vietnam view shows them as ≈ VND and never mentions USDC
 * (section 0: the Vietnam view shows no USDC).
 */
export function howSteps(vn: boolean, lockAtHire = true): HowStep[] {
  const m = (usdc: bigint) => moneyLabel(usdc * 1_000_000n, vn);
  return [
    {
      role: 'Business',
      title: 'Post and lock the budget',
      text: lockAtHire
        ? 'Write the brief, split it into milestones and lock the budget now or when you hire. The job appears with a "Budget locked" or "Locks when hired" badge anyone can check on Explorer.'
        : 'Write the brief, split it into milestones and lock the whole budget. The job appears with a "Budget locked" badge anyone can check on Explorer.',
      note: 'One page, one wallet confirmation to lock, one to save the public brief.',
      mockLabel: 'Post a job',
      mockTitle: 'Icon set, 24 icons',
      rows: [
        ['1 milestone', m(15n)],
        ['Apply by', '10 Oct'],
      ],
      button: vn ? 'Lock the budget & publish' : 'Lock 15.00 USDC & publish',
      onChain: true,
    },
    {
      role: 'Freelancer',
      title: 'Apply with a short pitch',
      text: "Read the brief (it matches its fingerprint on Solana) and the business's track record, then apply with up to 280 bytes. Your pitch is public on Solana, so keep personal details out.",
      note: 'One wallet confirmation; the network fee is test SOL on devnet.',
      mockLabel: 'Job detail',
      mockTitle: 'Logo refresh for a coffee brand',
      rows: [
        ['Budget', `${m(20n)} locked`],
        ['Applicants', '4'],
      ],
      button: 'Apply',
      onChain: true,
    },
    {
      role: 'Business',
      title: 'Select one applicant',
      text: 'Compare pitches and track records counted from Solana. Selecting someone creates a Milestone Lock contract with your brief and real deadlines.',
      note: 'If the person does not accept in time, you can select someone else.',
      mockLabel: 'Applicants',
      mockTitle: 'Select @linh?',
      rows: [
        ['Contracts completed', '5'],
        ['Submitted on time', '5 of 5'],
      ],
      button: 'Create contract & select',
      onChain: true,
    },
    {
      role: 'Freelancer',
      title: 'Accept and start',
      text: 'Choose where earnings go: your own wallet, or VND to your bank through a payout partner. When you accept, the locked budget moves into your contract in the same transaction.',
      note: 'In this demo the payout partner is simulated.',
      mockLabel: 'Accept',
      mockTitle: 'Where should your earnings go?',
      rows: vn ? [['VND to my bank account', 'Selected']] : [
        ['VND to my bank account', 'Selected'],
        ['My own wallet (USDC)', ''],
      ],
      button: 'Accept & start',
      onChain: true,
    },
    {
      role: 'Both',
      title: 'Deliver, review, release',
      text: 'Share a watermarked preview for each milestone. The client accepts and releases, or requests changes; the money never goes back on a refusal. Final files follow the release.',
      note: 'If the client does not review in time, anyone can release the milestone.',
      mockLabel: 'Milestone 1',
      mockTitle: 'Two logo concepts',
      rows: [
        ['Status', 'Released'],
        ['Sent to', 'Payout partner'],
      ],
      button: 'Released',
      onChain: false,
    },
  ];
}

export const ERROR_TEXT = "Couldn't read jobs from Solana. Try again.";

export function Overview() {
  const viewer = useHubViewer();
  const jobs = useOpenJobs();
  const now = useChainTime();
  const businesses = (jobs.data ?? []).slice(0, 12).map((j) => j.business.toBase58());
  const names = useDisplayNames(businesses).data ?? {};
  return (
    <OverviewView
      jobs={jobs.data ?? null}
      loading={jobs.isPending}
      error={jobs.isError && !jobs.data}
      onRetry={() => void jobs.refetch()}
      vn={viewer.vn}
      client={viewer.signedIn && !viewer.vn}
      signedIn={viewer.signedIn}
      names={names}
      now={now}
      lockAtHire={FEATURES.lockAtHire}
    />
  );
}

export interface OverviewViewProps {
  jobs: JobListingAccount[] | null;
  loading: boolean;
  error: boolean;
  onRetry(): void;
  /** Money in ≈ VND (the Vietnam view) */
  vn: boolean;
  /** Client copy and actions: signed in, outside the Vietnam view */
  client: boolean;
  signedIn: boolean;
  names: Record<string, string>;
  now: number;
  /** v1.4 (D29) copy and stats; off = the v1.3 page (funded listings only) */
  lockAtHire?: boolean;
}

export function OverviewView(props: OverviewViewProps) {
  const lockAtHire = props.lockAtHire ?? true;
  // Flag off: the v1.3 page counts and shows funded listings only
  const p = lockAtHire ? props : { ...props, jobs: props.jobs ? props.jobs.filter((j) => !j.unfunded) : null };
  const stats = overviewStats(p.jobs ?? []);
  const ready = p.jobs !== null && !p.loading;
  // Signed in and not a client means the Vietnam view (client = signed in outside it)
  const audience: OverviewAudience = p.client ? 'client' : p.signedIn ? 'vn' : 'guest';
  const name = (j: JobListingAccount) => p.names[j.business.toBase58()] ?? shortAddress(j.business.toBase58());
  return (
    <>
      <Hero {...p} stats={stats} ready={ready} audience={audience} lockAtHire={lockAtHire} />
      {p.error ? (
        <div className={`${hub.container} ${styles.errorWrap}`}>
          <div className={styles.error} role="alert">
            {ERROR_TEXT}
            <HubButton variant="white" size="small" onClick={p.onRetry}>
              <HubIcon name="refresh" size={14} />
              Retry
            </HubButton>
          </div>
        </div>
      ) : null}
      <Trust stats={stats} ready={ready} lockAtHire={lockAtHire} />
      <Rules vn={p.vn} lockAtHire={lockAtHire} />
      <Featured {...p} stats={stats} ready={ready} name={name} />
      <HowItWorks vn={p.vn} lockAtHire={lockAtHire} />
    </>
  );
}

/* ---- V5.1 hero ---- */

function Hero(p: OverviewViewProps & { stats: OverviewStats; ready: boolean; audience: OverviewAudience; lockAtHire: boolean }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const copy = (p.lockAtHire ? HERO : HERO_V13)[p.audience];
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const query = filtersToQuery({ q });
    navigate(query ? `/jobs/find?${query}` : '/jobs/find');
  };
  const newest = p.stats.newestFunded;
  const lockedUsdc = Number(usdcFromUnits(p.stats.lockedUnits));
  return (
    <section aria-labelledby="hb-h1" className={`${hub.container} ${styles.heroWrap}`}>
      <div className={styles.heroFrame}>
        <div className={`${styles.hero} rv-scale`} data-testid="hero">
          <svg aria-hidden className={`${styles.layer} px-sky`} viewBox="0 0 1200 640" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="hb-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#120C22" />
                <stop offset="0.42" stopColor="#3A1F62" />
                <stop offset="0.68" stopColor="#8E4A8C" />
                <stop offset="0.84" stopColor="#E0866C" />
                <stop offset="1" stopColor="#F5C07A" />
              </linearGradient>
              <radialGradient id="hb-sun" cx="0.74" cy="0.7" r="0.42">
                <stop offset="0" stopColor="#FFE2B0" stopOpacity="0.95" />
                <stop offset="0.35" stopColor="#F7A86F" stopOpacity="0.45" />
                <stop offset="1" stopColor="#F7A86F" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="1200" height="640" fill="url(#hb-sky)" />
            <rect width="1200" height="640" fill="url(#hb-sun)" />
            <g fill="#FFFFFF" opacity="0.55">
              {[
                [120, 80, 1.2],
                [260, 140, 1],
                [430, 60, 1.4],
                [610, 110, 1],
                [760, 50, 1.2],
                [980, 90, 1],
                [1110, 150, 1.3],
                [340, 210, 0.9],
                [860, 190, 0.9],
              ].map(([cx, cy, r]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
              ))}
            </g>
          </svg>
          <svg aria-hidden className={`${styles.layer} px-1`} viewBox="0 0 1200 640" preserveAspectRatio="xMidYMax slice">
            <path d="M0 430C200 380 380 425 560 395S900 352 1200 398V640H0Z" fill="#5B2E7A" opacity="0.9" />
          </svg>
          <svg aria-hidden className={`${styles.layer} px-2`} viewBox="0 0 1200 640" preserveAspectRatio="xMidYMax slice">
            <path d="M0 486C170 452 410 506 640 472S1010 440 1200 474V640H0Z" fill="#3B1D58" />
          </svg>
          <svg aria-hidden className={`${styles.layer} px-3`} viewBox="0 0 1200 640" preserveAspectRatio="xMidYMax slice">
            <path d="M0 548C240 512 520 566 770 532S1090 520 1200 548V640H0Z" fill="#1F102D" />
            <path
              d="M60 600l6-34M78 604l-4-30M96 600l8-28M300 610l4-36M318 606l-6-28M700 612l5-32M716 608l-3-26M1000 606l6-30M1018 610l-4-34"
              stroke="#2E1842"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <div aria-hidden className={styles.heroShade} />

          <div className={styles.heroText}>
            <span className={`${styles.eyebrow} hb-in`}>
              <span className={styles.eyebrowDot} aria-hidden />
              Jobs with budgets locked on Solana
            </span>
            <h1 id="hb-h1" className={`${styles.h1} hb-in-2`}>
              {copy.title[0]}
              <br />
              {copy.title[1]}
            </h1>
            <p className={`${styles.heroSub} hb-in-3`}>{copy.sub}</p>
            <form role="search" aria-label="Search jobs" className={`${styles.search} hb-in-4`} onSubmit={submit}>
              <HubIcon name="search" size={17} color="rgba(255,255,255,0.8)" />
              <label className={styles.searchField}>
                <span className="visually-hidden">Search jobs</span>
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search logo, Framer, translation…" />
              </label>
              <button type="submit" className={styles.searchButton}>
                Search
                <span className="hb-arrow" style={{ display: 'inline-flex' }}>
                  <HubIcon name="external" size={14} />
                </span>
              </button>
            </form>
            <div className={`${styles.heroLinks} hb-in-4`}>
              <Link to="/jobs/find" className="hb-ul">
                Find jobs
                <span className="hb-arrow">
                  <HubIcon name="external" size={14} />
                </span>
              </Link>
              {copy.link.to.startsWith('#') ? (
                <a href={copy.link.to} className="hb-ul">
                  {copy.link.label}
                  <span className="hb-arrow">
                    <HubIcon name="external" size={14} />
                  </span>
                </a>
              ) : (
                <Link to={copy.link.to} className="hb-ul">
                  {copy.link.label}
                  <span className="hb-arrow">
                    <HubIcon name="external" size={14} />
                  </span>
                </Link>
              )}
            </div>
          </div>

          {newest ? (
            <Link
              to={`/jobs/${newest.address.toBase58()}`}
              className={`${styles.glass} hb-float hb-in-3`}
              data-testid="glass-card"
              aria-label={`Newest funded job: ${newest.title}, ${moneyLabel(newest.total, p.vn)}`}
            >
              <span className={styles.glassThumb}>
                <span className={styles.glassChip}>
                  <HubIcon name="lock" size={11} width={2.6} />
                  Budget locked
                </span>
                <span className={styles.glassMoney}>{moneyLabel(newest.total, p.vn)}</span>
              </span>
              <span className={styles.glassLabel}>Newest funded job</span>
              <span className={styles.glassTitle}>
                <span>{newest.title}</span>
                <span className="hb-arrow">
                  <HubIcon name="external" size={14} />
                </span>
              </span>
            </Link>
          ) : null}
        </div>

        <div className={styles.notch} data-testid="notch">
          <span className={`${styles.corner} ${styles.cornerTop}`} aria-hidden />
          <span className={`${styles.corner} ${styles.cornerLeft}`} aria-hidden />
          {p.ready ? (
            <>
              <StatCounter
                value={lockedUsdc}
                format={(n) => lockedStatLabel(n, p.vn)}
                label={
                  <>
                    locked in open jobs, read from Solana now
                    {p.stats.unfundedCount ? (
                      <span className={styles.statExtra} data-testid="unfunded-count">
                        +{p.stats.unfundedCount} {p.stats.unfundedCount === 1 ? 'job that locks' : 'jobs that lock'} when hired
                      </span>
                    ) : null}
                  </>
                }
              />
              <StatCounter value={p.stats.openCount} label={p.lockAtHire ? 'open jobs, each with the budget locked before you accept' : 'open jobs, each with its budget already locked'} />
              <StatCounter value={p.stats.applications} label="applications on open jobs" />
            </>
          ) : (
            [0, 1, 2].map((i) => (
              <div key={i} className={styles.statSkeleton} data-testid="stat-skeleton" aria-hidden>
                <span />
                <span />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

/* ---- V5.2 trust and category circles ---- */

function Trust({ stats, ready, lockAtHire }: { stats: OverviewStats; ready: boolean; lockAtHire: boolean }) {
  return (
    <section aria-labelledby="hb-trust" className={`${hub.container} ${styles.trust}`}>
      <Reveal className={styles.trustHead}>
        <div className={styles.trustTitle}>
          <SectionHeading id="hb-trust" title="Funded first, " tone="so both sides can start with trust" />
        </div>
        <p className={styles.trustText}>{lockAtHire ? TRUST_TEXT : TRUST_TEXT_V13}</p>
      </Reveal>
      <Reveal className={styles.circles} role="list" aria-label="Browse by field">
        {JOB_CATEGORIES.map((c, i) => {
          const look = CATEGORY_LOOK[c.index] ?? CATEGORY_LOOK[CATEGORY_LOOK.length - 1];
          const n = stats.byCategory[c.index] ?? 0;
          const count = ready ? openJobsLabel(n) : '…';
          return (
            <Link
              key={c.id}
              role="listitem"
              to={`/jobs/find?${filtersToQuery({ cat: c.id })}`}
              className={`${styles.circle} ${i === 0 ? styles.circleFirst : ''} hb-lift`}
              aria-label={`${c.label}, ${count}`}
            >
              <HubIcon name={look.icon} size={22} width={2} color={look.ink} />
              <span className={styles.circleLabel}>{c.label}</span>
              <span className={styles.circleCount}>{count}</span>
            </Link>
          );
        })}
      </Reveal>
    </section>
  );
}

/* ---- V5.3 rules ---- */

function Rules({ vn, lockAtHire }: { vn: boolean; lockAtHire: boolean }) {
  return (
    <section aria-labelledby="hb-rules" className={styles.rules}>
      <div className={`${hub.container} ${styles.rulesInner}`}>
        <Reveal className={styles.rulesHead}>
          <SectionHeading id="hb-rules" center title="Same rules for every job, " tone="written into the program" />
        </Reveal>
        <Reveal className={styles.rulesGrid}>
          {rulesFor(vn, lockAtHire).map((r) => (
            <div key={r.title} className={styles.rule}>
              <span className={styles.ruleIcon} aria-hidden>
                <HubIcon name={r.icon} size={17} width={2.1} />
              </span>
              <h3 className={styles.ruleTitle}>{r.title}</h3>
              <p className={styles.ruleText}>{r.text}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ---- V5.4 featured split ---- */

function Featured(p: OverviewViewProps & { stats: OverviewStats; ready: boolean; name(j: JobListingAccount): string }) {
  const [pick, setPick] = useState(0);
  const feats = p.stats.featured;
  const job = feats[pick] ?? feats[0] ?? null;
  return (
    <section aria-labelledby="hb-feat" className={`${hub.container} ${styles.featured}`}>
      <Reveal kind="x" className={styles.featLeft}>
        <SectionHeading id="hb-feat" title="Featured jobs, " tone="for every kind of skill" />
        <HubButton variant="purple" to="/jobs/find" arrow className={styles.featFind} style={{ height: 42 }}>
          Find jobs
        </HubButton>
        <div className={styles.featGrid}>
          {!p.ready
            ? [0, 1, 2, 3].map((i) => <div key={i} className={styles.featSkeleton} data-testid="job-skeleton" />)
            : feats.map((j, i) => (
                <Link
                  key={j.address.toBase58()}
                  to={`/jobs/${j.address.toBase58()}`}
                  className={`${styles.featCard} ${i === pick ? styles.featOn : ''} hb-lift`}
                  onMouseEnter={() => setPick(i)}
                  onFocus={() => setPick(i)}
                  data-testid="featured-card"
                  aria-current={i === pick ? 'true' : undefined}
                >
                  <span className={styles.featN}>0{i + 1}</span>
                  <span className={styles.featTitle}>{j.title}</span>
                  <span className={styles.featMeta}>
                    {categoryLabel(j.category)} · {moneyLabel(j.total, p.vn)}
                  </span>
                  <span className={`${styles.featMore} hb-ul`}>View details</span>
                </Link>
              ))}
        </div>
        {p.ready && !feats.length ? (
          <EmptyState
            title="No open jobs yet"
            body={p.client ? 'Post the first one: lock a budget and publish it.' : 'New jobs show up here as soon as a business locks a budget.'}
            action={p.client ? <HubButton variant="dark" to="/jobs/new">Post a job</HubButton> : undefined}
          />
        ) : null}
      </Reveal>
      <Reveal className={styles.preview} aria-live="polite">
        <svg aria-hidden className={styles.layer} viewBox="0 0 600 520" preserveAspectRatio="xMidYMax slice">
          <path d="M0 330C120 300 260 340 380 312S540 290 600 306V520H0Z" fill="#3B1D58" opacity="0.8" />
          <path d="M0 392C160 362 330 410 470 380S580 370 600 384V520H0Z" fill="#1F102D" />
        </svg>
        {job ? (
          <div className={styles.previewPanel} data-testid="featured-preview" key={job.address.toBase58()}>
            <div className={`${styles.previewTop} hb-in`}>
              <Avatar seed={job.business.toBase58()} size={30} decorative />
              <span className={styles.previewWho}>
                {p.name(job)} · {categoryLabel(job.category)}
              </span>
              <ListingBudgetChip unfunded={job.unfunded} />
            </div>
            <div className={styles.previewTitle}>{job.title}</div>
            <div className={styles.plan}>
              {job.milestones.slice(0, 3).map((m) => (
                <div key={m.index} className={styles.planRow}>
                  <span className={styles.planN}>{m.index + 1}</span>
                  <span className={styles.planText}>
                    <span className={styles.planName}>Milestone {m.index + 1}</span>
                    <span className={styles.planDue}>Due {spanLabel(m.workSecs)} after selection</span>
                  </span>
                  <span className={styles.planMoney}>{moneyLabel(m.amount, p.vn)}</span>
                </div>
              ))}
            </div>
            <div className={styles.previewFoot}>
              <span>
                <span className={styles.previewMoney}>{moneyLabel(job.total, p.vn)}</span>
                <span className={styles.previewSub}>
                  {p.now > job.applyBy ? 'Applications closed' : `Apply by ${formatDeadline(job.applyBy)}`} · {applicantsLabel(job.applicationCount)}
                </span>
              </span>
              <HubButton variant="purple" to={`/jobs/${job.address.toBase58()}`} arrow style={{ height: 42 }}>
                Apply
              </HubButton>
            </div>
          </div>
        ) : null}
      </Reveal>
    </section>
  );
}

/* ---- V5.5 how it works ---- */

function HowItWorks({ vn, lockAtHire }: { vn: boolean; lockAtHire: boolean }) {
  const steps = howSteps(vn, lockAtHire);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const paused = hover || focus;
  const { index, select, round } = useAutoAdvance(steps.length, undefined, paused);
  const s = steps[index];
  return (
    <section id="hb-how" aria-labelledby="hb-how-title" className={`${hub.container} ${styles.how}`}>
      <Reveal className={styles.howHead}>
        <SectionHeading id="hb-how-title" center title="See how a job runs, " tone="step by step" />
      </Reveal>
      <Reveal
        className={styles.showcase}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setFocus(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus(false);
        }}
        data-testid="showcase"
      >
        <div className={styles.showRow} id="hb-how-panel" role="tabpanel" aria-labelledby={`hb-how-tab-${index}`}>
          <div className={`${styles.showText} hb-in`} key={`t${index}`}>
            <span className={styles.showRole}>{s.role}</span>
            <h3 className={styles.showTitle}>{s.title}</h3>
            <p className={styles.showBody}>{s.text}</p>
            <div className={styles.showNote}>{s.note}</div>
          </div>
          <div className={styles.showArt} aria-hidden>
            <div className={`${styles.mock} hb-in`} key={`m${index}`}>
              <div className={styles.mockLabel}>{s.mockLabel}</div>
              <div className={styles.mockTitle}>{s.mockTitle}</div>
              <div className={styles.mockRows}>
                {s.rows.map(([a, b]) => (
                  <div key={a} className={styles.mockRow}>
                    <span>{a}</span>
                    <span className={styles.mockValue}>{b}</span>
                  </div>
                ))}
              </div>
              <div className={`${styles.mockButton} ${s.onChain ? '' : styles.mockDone}`}>{s.button}</div>
            </div>
          </div>
        </div>
        <div role="tablist" aria-label="Steps" className={styles.tabs}>
          {steps.map((x, i) => {
            const on = i === index;
            return (
              <button
                key={x.title}
                id={`hb-how-tab-${i}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls="hb-how-panel"
                tabIndex={on ? 0 : -1}
                className={`${styles.tab} ${on ? styles.tabOn : ''}`}
                onClick={() => select(i)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + steps.length) % steps.length;
                    select(next);
                    document.getElementById(`hb-how-tab-${next}`)?.focus();
                  }
                }}
              >
                <span className={styles.tabN}>0{i + 1}</span>
                <span className={styles.tabLabel}>{x.title}</span>
                <span className={styles.track} aria-hidden>
                  {on ? <span key={`${index}-${round}`} className={`${styles.fill} hb-fill ${paused ? 'hb-paused' : ''}`} data-testid="tab-fill" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
