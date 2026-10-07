// Two-tone heading of the hub v4 (V2, V5): Inter 300, the first part in ink, the second in grey (#9A9AA6, display
// sizes only). `title` alone gives a one-tone heading.
import type { ReactNode } from 'react';
import styles from './components.module.css';

export interface SectionHeadingProps {
  id?: string;
  title: ReactNode;
  /** The grey second part */
  tone?: ReactNode;
  sub?: ReactNode;
  center?: boolean;
  /** h1 for a page title, h2 for a section */
  level?: 1 | 2;
  size?: 'section' | 'page';
}

export function SectionHeading({ id, title, tone, sub, center = false, level = 2, size = 'section' }: SectionHeadingProps) {
  const H = level === 1 ? 'h1' : 'h2';
  return (
    <div className={`${styles.heading} ${center ? styles.center : ''}`}>
      <H id={id} className={`${styles.h2} ${size === 'page' ? styles.hPage : ''}`}>
        {title}
        {tone ? <span className={styles.tone}>{tone}</span> : null}
      </H>
      {sub ? <p className={styles.sub}>{sub}</p> : null}
    </div>
  );
}

export const TwoToneHeading = SectionHeading;
