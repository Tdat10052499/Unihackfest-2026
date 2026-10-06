// /sign-in (WebSignIn board). The button opens the wallet panel, which does the Google sign-in.
import { m } from 'motion/react';
import { useWalletPanel } from '../components/WalletPanelContext.tsx';
import { PhoneIcon } from '../components/icons.tsx';
import { rise, screen, staggerParent } from '../motion.ts';
import { LegalLinks } from '../components/LegalLinks.tsx';
import styles from './SignIn.module.css';

const CARDS = [
  {
    role: 'Client',
    title: 'Write the brief',
    text: 'Scope, milestones and what counts as done. Its fingerprint is saved on-chain, so neither side can change it later.',
    icon: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  },
  {
    role: 'Freelancer',
    title: 'Submit your work',
    text: 'Links and files from your computer, before the deadline. The chain clock records when you submitted.',
    icon: 'M12 19V5M5 12l7-7 7 7',
  },
  {
    role: 'Client',
    title: 'Review and release',
    text: 'Check the delivery against the brief, then release. If you do not review by the review deadline, anyone can release it to the freelancer.',
    icon: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  },
];

export function SignIn() {
  const { setOpen } = useWalletPanel();
  return (
    <m.main id="main" className={styles.main} variants={screen} initial="hidden" animate="shown">
      <div className={styles.intro}>
        <span className={styles.chip}>For freelancers and the clients who hire them</span>
        <h1 className={styles.h1}>Write the brief. Deliver the work. Get it released.</h1>
        <p className={styles.lead}>
          The Workspace is the computer side of your N.E.D Wallet. Clients write the brief and lock money per milestone. Freelancers submit their work
          before the deadline. Money moves only from a wallet, when its owner confirms.
        </p>
        <div className={styles.ctaRow}>
          <button type="button" className={styles.cta} onClick={() => setOpen(true)}>
            Sign in with N.E.D Wallet
          </button>
          <span className={styles.hint}>Use the same Google account as on your phone.</span>
        </div>
      </div>

      <m.div className={styles.cards} variants={staggerParent}>
        {CARDS.map((c, i) => (
          <m.div key={c.title} className={styles.card} variants={rise} custom={i}>
            <div className={styles.cardTop}>
              <span className={styles.badge} aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--purple-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={c.icon} />
                </svg>
              </span>
              <span className={styles.role}>{c.role}</span>
            </div>
            <h2 className={styles.h2}>{c.title}</h2>
            <p className={styles.cardText}>{c.text}</p>
          </m.div>
        ))}
      </m.div>

      <div className={styles.phone}>
        <span className={styles.phoneBadge} aria-hidden>
          <PhoneIcon size={18} />
        </span>
        <div className={styles.phoneText}>
          <p className={styles.phoneTitle}>Your phone stays the wallet</p>
          <p className={styles.phoneSub}>
            Same Google sign-in, same wallet, same contracts. Do the long work here; check status and confirm on your phone when you are away from your desk.
          </p>
        </div>
      </div>

      <p className={styles.disclaimer}>
        Devnet pilot · test money only. N.E.D holds no funds and charges no fee during the pilot. In the Vietnam view, earnings arrive in VND through a payout
        partner (simulated in the demo).
      </p>
      <LegalLinks className={styles.disclaimer} />
    </m.main>
  );
}
