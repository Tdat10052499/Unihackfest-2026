// Status chip (appendix H.1 tones) and the "Budget locked" chip every listing shows.
import type { ReactNode } from 'react';
import { HubIcon } from './HubIcon.tsx';
import styles from './components.module.css';

export type ChipTone = 'info' | 'purple' | 'success' | 'neutral' | 'warning';
const TONE: Record<ChipTone, string> = { info: styles.info, purple: styles.purpleTone, success: styles.success, neutral: styles.neutral, warning: styles.warning };

export function Chip({ tone = 'neutral', onDark = false, children }: { tone?: ChipTone; onDark?: boolean; children: ReactNode }) {
  return <span className={`${styles.chip} ${TONE[tone]} ${onDark ? styles.onDark : ''}`}>{children}</span>;
}

export function BudgetLockedChip({ onDark = false }: { onDark?: boolean }) {
  return (
    <Chip tone="success" onDark={onDark}>
      <HubIcon name="lock" size={12} width={2.4} />
      Budget locked
    </Chip>
  );
}
