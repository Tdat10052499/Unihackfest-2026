// /contracts — every contract of this wallet in the table of the WebWorkspace board.
import { m } from 'motion/react';
import { useAuth } from '../auth/AuthProvider.tsx';
import { ContractsTable } from '../components/ContractsTable.tsx';
import { WorkspaceNav } from '../components/WorkspaceNav.tsx';
import shell from '../components/Shell.module.css';
import { useFunds } from '../hooks/queries.ts';
import { useRegion } from '../hooks/region.ts';
import { useAccount } from '../hooks/account.ts';
import { rise, staggerParent } from '../motion.ts';
import styles from './Overview.module.css';

export function Contracts() {
  const { walletAddress } = useAuth();
  const { region } = useRegion(walletAddress);
  const { funds, loading, error } = useFunds(walletAddress, region);
  const client = useAccount(walletAddress).capabilities.createContract;
  return (
    <div className={shell.shell}>
      <WorkspaceNav client={client} />
      <m.main id="main" className={shell.main} variants={staggerParent} initial="hidden" animate="shown">
        <m.h1 variants={rise} custom={0} className={styles.name} style={{ margin: 0 }}>
          Contracts
        </m.h1>
        <m.section variants={rise} custom={1} aria-label="Your contracts">
          {error ? (
            <p className={`${shell.message} ${shell.error}`} role="alert">
              Could not read your contracts. Check your connection; we try again every few seconds.
            </p>
          ) : funds.length ? (
            <ContractsTable funds={funds} vn={region === 'vn'} />
          ) : (
            <p className={styles.empty}>{loading ? 'Reading your contracts from the chain…' : 'No contracts yet.'}</p>
          )}
        </m.section>
      </m.main>
    </div>
  );
}
