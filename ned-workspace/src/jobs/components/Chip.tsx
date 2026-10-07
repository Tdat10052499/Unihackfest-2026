// Status chip (appendix H.1 tones), the "Budget locked" / "Locked" success chip (V7), the neutral "Locks when hired"
// chip of a v1.4 listing (D29), and the removable filter chip of Find jobs (V6.4: tint, 34 px, ×).
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

/** Neutral chip of a listing that locks its budget when the business selects someone (v1.4, D29) */
export function LocksWhenHiredChip({ onDark = false, short = false }: { onDark?: boolean; short?: boolean }) {
  return (
    <Chip tone="neutral" onDark={onDark} small={short}>
      <HubIcon name="clock" size={short ? 11 : 12} width={2.6} />
      Locks when hired
    </Chip>
  );
}

/** The chip that follows the listing kind: funded → "Budget locked" (success), unfunded → "Locks when hired" */
export function ListingBudgetChip({ unfunded, onDark = false, short = false }: { unfunded: boolean; onDark?: boolean; short?: boolean }) {
  return unfunded ? <LocksWhenHiredChip onDark={onDark} short={short} /> : <BudgetLockedChip onDark={onDark} short={short} />;
}

/** "budget locked" / "locks when hired": the aria-label words of a card (CL 9.3 item 8) */
export const budgetWords = (unfunded: boolean) => (unfunded ? 'locks when hired' : 'budget locked');

/** A filter that is on; the button removes it */
export function RemovableChip({ label, onRemove }: { label: string; onRemove(): void }) {
  return (
    <button type="button" className={`${styles.removable} hb-pop`} aria-label={`Remove filter ${label}`} onClick={onRemove}>
      {label}
      <HubIcon name="close" size={13} width={2.6} />
    </button>
  );
}
