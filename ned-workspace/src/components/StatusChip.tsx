import type { ChipTone } from '@ned/core/milestone/view.ts';
import styles from './Shell.module.css';

const TONE: Record<ChipTone, string> = { info: 'info', accent: 'purple', warning: 'warning', success: 'success', neutral: 'neutral' };

/** Status chip of the boards: tint background, ink text, dot */
export function StatusChip({ tone, children }: { tone: ChipTone; children: string }) {
  const t = TONE[tone];
  return (
    <span className={styles.chip} style={{ background: `var(--${t}-bg)`, color: `var(--${t}-ink)` }}>
      <span className={styles.chipDot} style={{ background: `var(--${t}-dot)` }} aria-hidden />
      {children}
    </span>
  );
}
