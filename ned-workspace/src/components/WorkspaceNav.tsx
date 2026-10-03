// Side navigation of the WebWorkspace board. Records and Settings live in the phone app until the Workspace has them;
// "New contract" is shown in the international view only (decision D18: no client actions in the Vietnam view).
import { NavLink } from 'react-router';
import { env } from '../config.ts';
import { Icon, type IconName } from './icons.tsx';
import styles from './Shell.module.css';

export function WorkspaceNav({ vn }: { vn: boolean }) {
  const item = (to: string, label: string, icon: IconName) => (
    <NavLink to={to} end className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}>
      <Icon name={icon} size={17} />
      {label}
    </NavLink>
  );
  const external = (path: string, label: string, icon: IconName) => (
    <a href={`${env.mobileOrigin}${path}`} target="_blank" rel="noreferrer" className={styles.navItem}>
      <Icon name={icon} size={17} />
      {label}
    </a>
  );
  return (
    <nav aria-label="Workspace" className={styles.nav}>
      {item('/', 'Overview', 'home')}
      {item('/contracts', 'Contracts', 'contracts')}
      {vn ? null : item('/new', 'New contract', 'plus')}
      {external('/records', 'Records', 'chart')}
      {external('/settings', 'Settings', 'settings')}
      <div className={styles.phoneCard}>
        <div className={styles.phoneTitle}>On your phone too</div>
        <div className={styles.phoneText}>Same Google sign-in, same wallet. Confirm steps from your phone when you are away.</div>
      </div>
    </nav>
  );
}
