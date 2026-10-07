// The three-step band (appendix H.7): freelancer copy (also the Vietnam view) or client copy.
import { HubIcon, type HubIconName } from './HubIcon.tsx';
import styles from './components.module.css';

export const STEPS: Record<'freelancer' | 'client', { icon: HubIconName; title: string; sub: string }[]> = {
  freelancer: [
    { icon: 'compass', title: 'Find a funded job', sub: 'Budget locked, checkable on Explorer' },
    { icon: 'pen', title: 'Apply with a short pitch', sub: 'Public, up to 280 bytes' },
    { icon: 'check', title: 'Accept and deliver', sub: 'Receive VND per milestone' },
  ],
  client: [
    { icon: 'lock', title: 'Post and lock the budget', sub: 'One page, three short steps' },
    { icon: 'people', title: 'Pick one applicant', sub: 'That creates the contract' },
    { icon: 'check', title: 'Release per milestone', sub: 'After you accept the work' },
  ],
};

const Swirl = ({ side }: { side: 'left' | 'right' }) => (
  <svg aria-hidden viewBox="0 0 80 140" className={`${styles.bandSwirl} ${side === 'left' ? styles.bandSwirlLeft : styles.bandSwirlRight}`}>
    <path d="M10 -10C60 30 0 80 50 150" fill="none" stroke="#16161C" strokeWidth="12" strokeLinecap="round" />
    <path d="M-10 10C30 40 -10 90 30 150" fill="none" stroke="#16161C" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

export function StepsBand({ role }: { role: 'freelancer' | 'client' }) {
  return (
    <section aria-label="How it works" className={styles.band}>
      <Swirl side="left" />
      <Swirl side="right" />
      <ol className={styles.steps}>
        {STEPS[role].map((s) => (
          <li key={s.title} className={styles.step}>
            <span className={styles.stepIcon}>
              <HubIcon name={s.icon} size={20} width={2} />
            </span>
            <span className={styles.stepTitle}>{s.title}</span>
            <span className={styles.stepSub}>{s.sub}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
