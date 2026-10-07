import type { ReactNode } from 'react';
import { HubIcon, type HubIconName } from './HubIcon.tsx';
import styles from './components.module.css';

export function EmptyState({ icon = 'inbox', title, body, action }: { icon?: HubIconName; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.empty} role="status">
      <span className={styles.emptyIcon}>
        <HubIcon name={icon} size={22} />
      </span>
      <p className={styles.emptyTitle}>{title}</p>
      {body ? <p className={styles.emptyBody}>{body}</p> : null}
      {action}
    </div>
  );
}
