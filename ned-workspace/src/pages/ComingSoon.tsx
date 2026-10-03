// Placeholders for the pages of the next tasks (W3 brief editor, W4 submit and review), so links never dead-end.
import { Link, useParams } from 'react-router';
import { m } from 'motion/react';
import { rise, screen } from '../motion.ts';
import styles from './Contract.module.css';

const COPY = {
  new: { title: 'New contract', text: 'The brief editor arrives in the next build of the Workspace.' },
  submit: { title: 'Submit your work', text: 'The delivery form (links, files, note) arrives in the next build of the Workspace.' },
  review: { title: 'Review the delivery', text: 'The review page arrives in the next build of the Workspace.' },
} as const;

export function ComingSoon({ page }: { page: keyof typeof COPY }) {
  const { fund } = useParams();
  const back = fund ? `/contract/${fund}` : '/';
  return (
    <m.main id="main" className={styles.page} variants={screen} initial="hidden" animate="shown">
      <m.div variants={rise} custom={0} className={styles.card}>
        <h1 className={styles.cardTitle}>{COPY[page].title}</h1>
        <p className={styles.muted}>{COPY[page].text}</p>
        <Link to={back} className={styles.secondary}>
          {fund ? 'Back to the contract' : 'Back to the overview'}
        </Link>
      </m.div>
    </m.main>
  );
}
