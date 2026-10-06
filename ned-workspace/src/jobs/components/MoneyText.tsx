// An amount in the viewer's money view: "10.00 USDC", or "≈ 260,000 VND (estimate)" with "$10.00 · estimate" under it
// in the Vietnam view (product-spec section 6; the VND figure is an estimate at the fixed demo rate). Never animated.
import { formatUsdc, usdcFromUnits, vndEstimate } from '@ned/core/milestone/format.ts';
import styles from './components.module.css';

export function moneyLabel(units: bigint, vn: boolean): string {
  return vn ? vndEstimate(units) : formatUsdc(units);
}

export function MoneyText({ units, vn, sub, size = 20 }: { units: bigint; vn: boolean; sub?: string; size?: number }) {
  const second = vn ? `$${usdcFromUnits(units)} · estimate` : sub;
  return (
    <span className={styles.money}>
      <span className={styles.moneyMain} style={{ fontSize: size }}>
        {moneyLabel(units, vn)}
      </span>
      {second ? <span className={styles.moneySub}>{second}</span> : null}
    </span>
  );
}
