// Status chip (appendix H.1 tones), the "Budget locked" / "Locked" success chip (V7), and the removable filter chip
// of Find jobs (V6.4: tint, 34 px, ×).
import type { ReactNode } from 'react';
import { HubIcon } from './HubIcon.tsx';
import styles from './components.module.css';

export type ChipTone = 'info' | 'purple' | 'success' | 'neutral' | 'warning';
const TONE: Record<ChipTone, string> = { info: styles.info, purple: styles.purpleTone, success: styles.success, neutral: styles.neutral, warning: styles.warning };

export function Chip({ tone = 'neutral', onDark = false, small = false, children }: { tone?: ChipTone; onDark?: boolean; small?: boolean; children: ReactNode }) {
  return <span className={`${styles.chip} ${TONE[tone]} ${small ? styles.chipSmall : ''} ${onDark ? styles.onDark : ''}`}>{children}</span>;
}

export function BudgetLockedChip({ onDark = false, short = false }: { onDark?: boolean; short?: boolean }) {
  return (
    <Chip tone="success" onDark={onDark} small={short}>
      <HubIcon name="lock" size={short ? 11 : 12} width={2.6} />
      {short ? 'Locked' : 'Budget locked'}
    </Chip>
  );
}

/** A filter that is on; the button removes it */
export function RemovableChip({ label, onRemove }: { label: string; onRemove(): void }) {
  return (
    <button type="button" className={`${styles.removable} hb-pop`} aria-label={`Remove filter ${label}`} onClick={onRemove}>
      {label}
      <HubIcon name="close" size={13} width={2.6} />
    </button>
  );
}
