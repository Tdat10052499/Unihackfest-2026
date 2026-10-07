// Hub stat (V5.1 notch): a number that counts up over 1.4 s on load (easeOutCubic; the final value at once under
// reduced motion) with its label. `format` turns the running number into text; screen readers get the final text.
import type { ReactNode } from 'react';
import { useCountUp } from '../motion.ts';
import styles from './components.module.css';

export function StatCounter({ value, format = (n) => Math.round(n).toLocaleString('en-US'), label }: { value: number; format?: (n: number) => string; label: ReactNode }) {
  const shown = useCountUp(value);
  return (
    <div className={styles.stat}>
      <span className={styles.statValue} aria-hidden>
        {format(shown)}
      </span>
      <span className="visually-hidden">{format(value)}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
