// Job card v4 (prompts-hub-v4.md V6.5, V7) and the list-view JobRow. The whole card is one link to /jobs/:job.
// Card: category dot and "Category · Up to …", the "Applied" / "Your job" chip, the green "Locked" chip; title (18/600,
// never the display font); summary; skill pills; footer with the business, "Apply by … · N applicants", the amount
// (Space Mono, "≈ … VND" in the Vietnam view) and the milestone count. Lifts on hover and reveals on scroll (.rv).
// `dark` is the v3 featured card, kept until H2 rebuilds the Overview.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { JobListingAccount } from '@ned/core/jobs/decode.ts';
import { categoryLabel, listingSkills } from '@ned/core/jobs/taxonomy.ts';
import { formatDeadline } from '@ned/core/milestone/format.ts';
import { Avatar } from '../../components/Avatar.tsx';
import { shortAddress } from '../../lib/format.ts';
import { CATEGORY_LOOK } from './categoryLook.ts';
import { BudgetLockedChip, Chip } from './Chip.tsx';
import { HubIcon } from './HubIcon.tsx';
import { moneyLabel } from './MoneyText.tsx';
import styles from './components.module.css';

const HOUR = 3_600;
const DAY = 86_400;

/** Longest work window as "45 min", "6 h", "3 days", "1 week", "2 weeks", "1 month" (devnet windows are short) */
export function durationLabel(seconds: number): string {
  if (seconds < HOUR) return `${Math.max(1, Math.ceil(seconds / 60))} min`;
  if (seconds < DAY) return `${Math.ceil(seconds / HOUR)} h`;
  if (seconds <= 3 * DAY) return '3 days';
  if (seconds <= 7 * DAY) return '1 week';
  if (seconds <= 14 * DAY) return '2 weeks';
  return '1 month';
}

export const applicantsLabel = (n: number) => (n === 0 ? 'no applicants yet' : n === 1 ? '1 applicant' : `${n} applicants`);
export const milestonesLabel = (n: number) => (n === 1 ? '1 milestone' : `${n} milestones`);

export type JobMine = 'applied' | 'own' | null;

export interface JobCardProps {
  job: JobListingAccount;
  vn: boolean;
  now: number;
  dark?: boolean;
  /** "@orbit_cafe", or a short address when the business has no username */
  businessName?: string;
  mine?: JobMine;
  /** Live preview on "Post a job": the same card, not a link */
  preview?: boolean;
}

/** The words both views share */
function cardFacts(job: JobListingAccount, now: number, businessName?: string) {
  const business = job.business.toBase58();
  const longest = Math.max(0, ...job.milestones.map((m) => m.workSecs));
  const closed = now > job.applyBy;
  return {
    business,
    name: businessName ?? shortAddress(business),
    category: categoryLabel(job.category),
    ink: (CATEGORY_LOOK[job.category] ?? CATEGORY_LOOK[CATEGORY_LOOK.length - 1]).ink,
    upTo: `Up to ${durationLabel(longest)}`,
    applyBy: closed ? 'Applications closed' : `Apply by ${formatDeadline(job.applyBy)}`,
    applicants: applicantsLabel(job.applicationCount),
    milestones: milestonesLabel(job.milestoneCount),
  };
}

/** The card's amount: "10.00 USDC", or "≈ 260,000 VND" with "Estimate" moved to the line under it */
const cardAmount = (units: bigint, vn: boolean) => moneyLabel(units, vn).replace(' (estimate)', '');

const MineChip = ({ mine }: { mine: JobMine }) =>
  mine === 'applied' ? (
    <Chip tone="info" small>
      Applied
    </Chip>
  ) : mine === 'own' ? (
    <Chip tone="purple" small>
      Your job
    </Chip>
  ) : null;

export function JobCard({ job, vn, now, dark = false, businessName, mine = null, preview = false }: JobCardProps) {
  const f = cardFacts(job, now, businessName);
  const skills = listingSkills(job.skills).slice(0, 3);
  const body = (
    <>
      <div className={styles.cardTop}>
        <span className={styles.catDot} style={{ background: f.ink }} aria-hidden />
        <span className={styles.cardCat}>
          {f.category} · {f.upTo}
        </span>
        <MineChip mine={mine} />
        <BudgetLockedChip short onDark={dark} />
      </div>
      <div>
        <h3 className={styles.cardTitle}>{job.title}</h3>
        {job.summary ? <p className={styles.cardSummary}>{job.summary}</p> : null}
      </div>
      {skills.length ? (
        <div className={styles.skills}>
          {skills.map((k) => (
            <span key={k.id} className={styles.skill}>
              {k.label}
            </span>
          ))}
        </div>
      ) : null}
      <div className={styles.cardFoot}>
        <Avatar seed={f.business} size={30} decorative />
        <span className={styles.cardWho}>
          <span className={styles.cardBiz}>{f.name}</span>
          <span className={styles.cardSub}>
            {f.applyBy} · {f.applicants}
          </span>
        </span>
        <span className={styles.cardAmount}>
          <span className={styles.cardMoney}>{cardAmount(job.total, vn)}</span>
          <span className={styles.cardMs}>{vn ? `Estimate · ${f.milestones}` : f.milestones}</span>
        </span>
      </div>
    </>
  );
  const cls = `${styles.card} ${dark ? styles.cardDark : ''}`;
  if (preview)
    return (
      <div className={cls} data-testid="job-card-preview">
        {body}
      </div>
    );
  return (
    <Link
      to={`/jobs/${job.address.toBase58()}`}
      className={`${cls} hb-lift rv`}
      aria-label={`${job.title}, ${moneyLabel(job.total, vn)}, budget locked`}
      data-testid="job-card"
    >
      {body}
    </Link>
  );
}

/** List view (V6.5): one row inside a hairline box; put rows in a JobRowList */
export function JobRow({ job, vn, now, businessName, mine = null }: Omit<JobCardProps, 'dark' | 'preview'>) {
  const f = cardFacts(job, now, businessName);
  return (
    <Link
      to={`/jobs/${job.address.toBase58()}`}
      className={styles.row}
      aria-label={`${job.title}, ${moneyLabel(job.total, vn)}, budget locked`}
      data-testid="job-row"
    >
      <Avatar seed={f.business} size={38} decorative />
      <span className={styles.rowMain}>
        <span className={styles.rowTitle}>
          {job.title} <MineChip mine={mine} />
        </span>
        <span className={styles.rowMeta}>
          {f.name} · {f.category} · {f.upTo} · {f.milestones}
        </span>
      </span>
      <span className={styles.rowWhen}>
        {f.applyBy}
        <br />
        {f.applicants}
      </span>
      <span className={styles.rowMoney}>
        <span className={styles.rowAmount}>{cardAmount(job.total, vn)}</span>
        <span className={styles.rowLocked}>
          <HubIcon name="lock" size={11} width={2.6} />
          {vn ? 'Estimate · budget locked' : 'Budget locked'}
        </span>
      </span>
      <span className={`hb-arrow ${styles.rowArrow}`}>
        <HubIcon name="external" size={16} />
      </span>
    </Link>
  );
}

export function JobRowList({ children }: { children: ReactNode }) {
  return <div className={styles.rowList}>{children}</div>;
}
