import type { ReactNode } from 'react';
import styles from './components.module.css';

export function SectionHeading({ id, title, sub, center = false }: { id?: string; title: ReactNode; sub?: ReactNode; center?: boolean }) {
  return (
    <div className={`${styles.heading} ${center ? styles.center : ''}`}>
      <h2 id={id} className={styles.h2}>
        {title}
      </h2>
      {sub ? <p className={styles.sub}>{sub}</p> : null}
    </div>
  );
}
