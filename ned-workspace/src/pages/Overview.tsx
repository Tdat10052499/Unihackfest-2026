// / — W1 placeholder of the Overview (WebWorkspace board): greeting and the "Your contracts" list from the chain.
// Stats, Needs your action cards, the side nav and contract links arrive with W2/W3.
import { m } from 'motion/react';
import type { ChipTone, FundView } from '@ned/core/milestone/view.ts';
import { useAuth } from '../auth/AuthProvider.tsx';
import { Avatar } from '../components/Avatar.tsx';
import { useFunds, useUsername } from '../data/queries.ts';
import { useRegion } from '../data/region.ts';
import { shortAddress } from '../lib/format.ts';
import { rise, screen, staggerParent } from '../motion.ts';
import styles from './Overview.module.css';

const TONE: Record<ChipTone, [string, string, string]> = {
  info: ['var(--info-bg)', 'var(--info-ink)', 'var(--info-dot)'],
  accent: ['var(--purple-bg)', 'var(--purple-ink)', 'var(--purple-dot)'],
  warning: ['var(--warning-bg)', 'var(--warning-ink)', 'var(--warning-dot)'],
  success: ['var(--success-bg)', 'var(--success-ink)', 'var(--success-dot)'],
  neutral: ['var(--neutral-bg)', 'var(--neutral-ink)', 'var(--neutral-dot)'],
};

function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? 'Good morning,' : h < 18 ? 'Good afternoon,' : 'Good evening,';
}

export function Overview() {
  const { walletAddress } = useAuth();
  const wallet = walletAddress!;
  const username = useUsername(wallet).data;
  const { region } = useRegion(wallet);
  const { funds, loading, error } = useFunds(wallet, region);
  const roles = new Set(funds.map((f) => f.role));
  const withLabel = roles.size !== 1 ? 'With' : roles.has('client') ? 'Freelancer' : 'Client';

  return (
    <m.main id="main" className={styles.main} variants={screen} initial="hidden" animate="shown">
      <m.div variants={staggerParent} style={{ display: 'contents' }}>
        <m.h1 className={styles.greeting} variants={rise} custom={0}>
          <span className={styles.hello}>{greeting()}</span>
          <span className={styles.name}>{username ? `@${username}` : shortAddress(wallet)}</span>
        </m.h1>

        <m.section aria-labelledby="ws-contracts" variants={rise} custom={1}>
          <h2 id="ws-contracts" className={styles.sectionTitle}>
            Your contracts
          </h2>
          <div className={styles.tableCard}>
            {loading ? (
              <p className={styles.message}>Reading your contracts from the chain…</p>
            ) : error ? (
              <p className={`${styles.message} ${styles.error}`} role="alert">
                Could not read your contracts. Check your connection; we try again every few seconds.
              </p>
            ) : funds.length === 0 ? (
              <p className={styles.message}>No contracts yet. When a client creates a contract with you, or you create one, it shows up here.</p>
            ) : (
              <div role="table" aria-label="Your contracts" className={styles.table}>
                <div role="row" className={`${styles.row} ${styles.headRow}`}>
                  <span role="columnheader">Contract</span>
                  <span role="columnheader">{withLabel}</span>
                  <span role="columnheader">Milestones</span>
                  <span role="columnheader">Next step</span>
                  <span role="columnheader" style={{ textAlign: 'right' }}>
                    Amount
                  </span>
                  <span role="columnheader">Status</span>
                </div>
                {funds.map((f) => (
                  <ContractRow key={f.address} fund={f} />
                ))}
              </div>
            )}
          </div>
        </m.section>
      </m.div>
    </m.main>
  );
}

function ContractRow({ fund: f }: { fund: FundView }) {
  const [bg, ink, dot] = TONE[f.tone];
  const done = f.milestones.filter((m) => m.status === 'released' || m.status === 'refunded' || m.status === 'cancelled').length;
  return (
    <div role="row" className={styles.row}>
      <span role="cell" className={styles.title} title={f.title}>
        {f.title}
      </span>
      <span role="cell" className={styles.party}>
        <Avatar seed={f.counterparty.wallet} size={28} decorative />
        {f.counterparty.username ? `@${f.counterparty.username}` : shortAddress(f.counterparty.wallet)}
      </span>
      <span role="cell" className={styles.cellText}>
        {done} of {f.milestones.length} done
      </span>
      <span role="cell" className={styles.next}>
        {f.nextAction?.label ?? '—'}
      </span>
      <span role="cell" className={styles.amount}>
        <span className={styles.amountValue}>{f.totalLabel}</span>
        {f.state === 'funded' && <span className={styles.amountSub}>{f.lockedLabel} locked</span>}
      </span>
      <span role="cell">
        <span className={styles.chip} style={{ background: bg, color: ink }}>
          <span className={styles.chipDot} style={{ background: dot }} aria-hidden />
          {f.statusLabel}
        </span>
      </span>
    </div>
  );
}
