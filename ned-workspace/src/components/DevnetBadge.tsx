import styles from './TopBar.module.css';

export function DevnetBadge() {
  return (
    <span className={styles.devnet}>
      <span className={styles.dot} aria-hidden />
      Devnet · test money
    </span>
  );
}
