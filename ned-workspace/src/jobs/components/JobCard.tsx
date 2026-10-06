// Job card (appendix H.9). The whole card is one link to /jobs/:job. Light by default; `dark` is the featured card
// (the first one on Overview). Anatomy: title (+ "Applied" / "Your job" chip), meta row (category, time to deliver,
// milestones), up to 3 skills, amount + "Budget locked", footer (business, apply by, applicants, call to action).
import { Link } from 'react-router';
import type { JobListingAccount } from '@ned/core/jobs/decode.ts';
import { categoryLabel, listingSkills } from '@ned/core/jobs/taxonomy.ts';
import { formatDeadline } from '@ned/core/milestone/format.ts';
import { Avatar } from '../../components/Avatar.tsx';
import { shortAddress } from '../../lib/format.ts';
import hub from '../hub.module.css';
import { BudgetLockedChip, Chip } from './Chip.tsx';
import { HubIcon } from './HubIcon.tsx';
import { moneyLabel, MoneyText } from './MoneyText.tsx';
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

export type JobMine = 'applied' | 'own' | null;

export interface JobCardProps {
  job: JobListingAccount;
  vn: boolean;
  now: number;
  dark?: boolean;
  /** "@orbit_cafe", or a short address when the business has no username */
  businessName?: string;
  mine?: JobMine;
}

export function JobCard({ job, vn, now, dark = false, businessName, mine = null }: JobCardProps) {
  const business = job.business.toBase58();
  const name = businessName ?? shortAddress(business);
  const longest = Math.max(0, ...job.milestones.map((m) => m.workSecs));
  const skills = listingSkills(job.skills).slice(0, 3);
  const closed = now > job.applyBy;
  const cta = mine === 'applied' ? 'View' : mine === 'own' ? 'Manage' : closed ? 'View' : 'Apply now';
  return (
    <Link
      to={`/jobs/${job.address.toBase58()}`}
      className={`${styles.card} ${dark ? styles.cardDark : ''} ${hub.lift}`}
      aria-label={`${job.title}, ${moneyLabel(job.total, vn)}, budget locked`}
      data-testid="job-card"
    >
      <div className={styles.cardTop}>
        <span className={styles.cardTitle}>{job.title}</span>
        {mine === 'applied' ? <Chip tone="info">Applied</Chip> : mine === 'own' ? <Chip tone="purple">Your job</Chip> : null}
      </div>
      <div className={styles.cardMeta}>
        <span className={styles.metaItem}>
          <HubIcon name="briefcase" size={13} />
          {categoryLabel(job.category)}
        </span>
        <span className={styles.metaItem}>
          <HubIcon name="clock" size={13} />
          {durationLabel(longest)}
        </span>
        <span className={styles.metaItem}>
          <HubIcon name="check" size={13} />
          {job.milestoneCount === 1 ? '1 milestone' : `${job.milestoneCount} milestones`}
        </span>
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
      <div className={styles.cardMoney}>
        <MoneyText units={job.total} vn={vn} sub="test USDC, locked" />
        <BudgetLockedChip onDark={dark} />
      </div>
      <div className={styles.cardFoot}>
        <Avatar seed={business} size={34} decorative />
        <span className={styles.cardWho}>
          <span className={styles.cardBiz}>{name}</span>
          <span className={styles.cardSub}>
            {closed ? 'Applications closed' : `Apply by ${formatDeadline(job.applyBy)}`} · {applicantsLabel(job.applicationCount)}
          </span>
        </span>
        <span className={styles.cardCta} aria-hidden>
          {cta}
        </span>
      </div>
    </Link>
  );
}
