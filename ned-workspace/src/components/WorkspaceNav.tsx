// Side navigation of the WebWorkspace board. Records and Settings open the wallet extension (the phone app, W6);
// "New contract" is shown to clients only: the international view (decision D18), or the client role with D30.
// "Jobs" opens the N.E.D Jobs site (D28) when FEATURES.jobs is on.
import { NavLink } from 'react-router';
import { FEATURES } from '../config.ts';
import { useWalletPanel } from './WalletPanelContext.tsx';
import { Icon, type IconName } from './icons.tsx';
import styles from './Shell.module.css';

export function WorkspaceNav({ client }: { client: boolean }) {
  const item = (to: string, label: string, icon: IconName) => (
    <NavLink to={to} end className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}>
      <Icon name={icon} size={17} />
      {label}
    </NavLink>
  );
  const { openWalletAt } = useWalletPanel();
  const inWallet = (path: string, label: string, icon: IconName) => (
    <button type="button" className={styles.navItem} onClick={() => openWalletAt(path)}>
      <Icon name={icon} size={17} />
      {label}
    </button>
  );
  return (
    <nav aria-label="Workspace" className={styles.nav}>
      {item('/', 'Overview', 'home')}
      {item('/contracts', 'Contracts', 'contracts')}
      {client ? item('/new', 'New contract', 'plus') : null}
      {FEATURES.jobs ? item('/jobs', 'Jobs', 'jobs') : null}
      {inWallet('/records', 'Records', 'chart')}
      {inWallet('/settings', 'Settings', 'settings')}
      <div className={styles.phoneCard}>
        <div className={styles.phoneTitle}>On your phone too</div>
        <div className={styles.phoneText}>Same Google sign-in, same wallet. Confirm steps from your phone when you are away.</div>
      </div>
    </nav>
  );
}
