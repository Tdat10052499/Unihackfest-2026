// "Your contracts" table of the WebWorkspace board: Contract · Freelancer/Client · Milestones · Next step · Amount ·
// Status. Rows open the contract page. Amounts follow the money view (≈ VND or USDC, never both as a balance).
import { Link } from 'react-router';
import { usdcFromUnits } from '@ned/core/milestone/format.ts';
import type { FundView } from '@ned/core/milestone/view.ts';
import { shortAddress } from '../lib/format.ts';
import { Avatar } from './Avatar.tsx';
import { StatusChip } from './StatusChip.tsx';
import styles from './Shell.module.css';

const done = (f: FundView) => f.milestones.filter((m) => m.status === 'released' || m.status === 'refunded' || m.status === 'cancelled').length;
const total = (f: FundView) => f.milestones.reduce((s, m) => s + m.amountUnits, 0n);

export function partyName(f: FundView) {
  return f.counterparty.username ? `@${f.counterparty.username}` : shortAddress(f.counterparty.wallet);
}

export function ContractsTable({ funds, vn }: { funds: FundView[]; vn: boolean }) {
  const roles = new Set(funds.map((f) => f.role));
  const withLabel = roles.size !== 1 ? 'With' : roles.has('client') ? 'Freelancer' : 'Client';
  return (
    <div className={styles.tableCard}>
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
          <Link key={f.address} role="row" to={`/contract/${f.address}`} className={styles.row}>
            <span role="cell" className={styles.cellTitle} title={f.title}>
              {f.title}
            </span>
            <span role="cell" className={styles.party}>
              <Avatar seed={f.counterparty.wallet} size={28} decorative />
              {partyName(f)}
            </span>
            <span role="cell" className={styles.cellText}>
              {done(f)} of {f.milestones.length} done
            </span>
            <span role="cell" className={styles.next}>
              {f.nextAction?.label ?? f.statusLabel}
            </span>
            <span role="cell" className={styles.amount}>
              <span className={styles.amountValue}>{f.totalLabel.replace(' (estimate)', '')}</span>
              <span className={styles.amountSub}>
                {vn
                  ? `$${usdcFromUnits(total(f))} · estimate`
                  : f.destination?.kind === 'payoutPartner'
                    ? 'to VND via payout partner'
                    : f.destination
                      ? 'to the freelancer’s wallet'
                      : 'total'}
              </span>
            </span>
            <span role="cell">
              <StatusChip tone={f.tone}>{f.statusLabel}</StatusChip>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
