// Switch row of the hub v4 (V6.4): the whole row is the control; 46×28 track, 22 px knob, purple when on.
import styles from './components.module.css';

export function Switch({ checked, onChange, label, sub }: { checked: boolean; onChange(next: boolean): void; label: string; sub?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className={styles.switchRow} onClick={() => onChange(!checked)}>
      <span className={styles.switchText}>
        <span className={styles.switchLabel}>{label}</span>
        {sub ? <span className={styles.switchSub}>{sub}</span> : null}
      </span>
      <span className={`${styles.switchTrack} ${checked ? styles.switchOn : ''}`} aria-hidden>
        <span className={styles.switchKnob} />
      </span>
    </button>
  );
}
