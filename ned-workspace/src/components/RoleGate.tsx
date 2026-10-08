// D30 role refusals (board WebRoleGate; roles-and-agreement-build.md §4). Behind FEATURES.accountRoles.
// RoleGateNotice: the GATE_COPY line after ensureAccount() refused an action, with Open settings / Also work (both open
// the wallet panel at /settings, where the role switches are). RoleGateCard: /new and /jobs/new opened by URL.
import { Link } from 'react-router';
import { GATE_COPY } from '@ned/core/account/copy.ts';
import { AGREEMENT_COPY } from '@ned/core/legal/agreement.ts';
import { useWalletPanel } from './WalletPanelContext.tsx';
import { Icon } from './icons.tsx';
import styles from './AccountPrompt.module.css';

export function gateLine(need: 'client' | 'freelancer', vn: boolean): string {
  if (need === 'freelancer') return GATE_COPY.freelancerNeeded;
  return vn ? GATE_COPY.clientNeededVN : GATE_COPY.clientNeeded;
}

/** The refusal of the last action, as a banner under the header */
export function RoleGateNotice() {
  const { gate, clearGate, openWalletAt } = useWalletPanel();
  if (!gate) return null;
  // People who live in Vietnam cannot add the client role: no button for them
  const action = gate.need === 'freelancer' ? GATE_COPY.alsoWork : gate.vn ? null : GATE_COPY.openSettings;
  return (
    <div role="alert" className="consent-gate" data-testid="role-gate">
      <span>{gateLine(gate.need, gate.vn)}</span>
      <span style={{ display: 'flex', gap: 8 }}>
        {action ? (
          <button
            type="button"
            onClick={() => {
              clearGate();
              openWalletAt('/settings');
            }}
          >
            {action}
          </button>
        ) : null}
        <button type="button" aria-label={AGREEMENT_COPY.close} onClick={clearGate}>
          <Icon name="close" size={14} color="#FFFFFF" />
        </button>
      </span>
    </div>
  );
}

/** /new and /jobs/new for an account without the client role (the Vietnam variant has no Open settings) */
export function RoleGateCard({ vn, title }: { vn: boolean; title?: string }) {
  const { openWalletAt } = useWalletPanel();
  return (
    <main id="main" className={styles.gatePage} data-testid="role-gate-card">
      <section aria-labelledby={title ? 'role-gate-title' : undefined} className={styles.gateCard}>
        <div className={styles.gateIcon} aria-hidden>
          <Icon name="jobs" size={24} color="var(--ink-2)" />
        </div>
        {title ? (
          <h1 id="role-gate-title" className={styles.title} style={{ marginTop: 18 }}>
            {title}
          </h1>
        ) : null}
        <p className={styles.gateText}>{gateLine('client', vn)}</p>
        <div className={styles.gateActions}>
          {vn ? null : (
            <button type="button" className={styles.gateButton} onClick={() => openWalletAt('/settings')}>
              {GATE_COPY.openSettings}
            </button>
          )}
          <Link to="/jobs/find" className={styles.gateLink}>
            {GATE_COPY.findWork}
          </Link>
        </div>
      </section>
    </main>
  );
}
