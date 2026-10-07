// Segmented control of the hub v4: grey track, white active thumb. `radio` (default) is a radiogroup with equal
// columns (Time to deliver, Milestones); `toggle` is a compact pill of icon buttons with aria-pressed (Grid / List).
import type { ReactNode } from 'react';
import styles from './components.module.css';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Accessible name when the label is an icon */
  name?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  mode = 'radio',
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange(next: T): void;
  label: string;
  mode?: 'radio' | 'toggle';
}) {
  const radio = mode === 'radio';
  return (
    <div
      role={radio ? 'radiogroup' : 'group'}
      aria-label={label}
      className={radio ? styles.segmented : styles.segToggle}
      style={radio ? { gridTemplateColumns: `repeat(${options.length}, 1fr)` } : undefined}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role={radio ? 'radio' : undefined}
            aria-checked={radio ? on : undefined}
            aria-pressed={radio ? undefined : on}
            aria-label={o.name}
            className={`${radio ? styles.segment : styles.segIcon} ${on ? styles.segOn : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
