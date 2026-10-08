// D30 "Finish setting up your account" (board WebAccountPrompt). Replaces RegionPrompt when FEATURES.accountRoles is on:
// shows while the signed-in wallet has no complete account; "Open in wallet" opens the wallet panel at /role
// (/role?update=1 for a wallet that used N.E.D before D30). "Later" closes it for this session and leaves a note.
import { useEffect, useRef, useState } from 'react';
import { m } from 'motion/react';
import { WEB_COPY } from '@ned/core/account/copy.ts';
import { useAuth } from '../auth/AuthProvider.tsx';
import { useAccount } from '../hooks/account.ts';
import { useWalletPanel } from './WalletPanelContext.tsx';
import { DURATION, EASE, EASE_OUT } from '../motion.ts';
import styles from './AccountPrompt.module.css';

const LATER = 'ned.accountLater.';

function laterFor(wallet: string): boolean {
  try {
    return sessionStorage.getItem(LATER + wallet) === '1';
  } catch {
    return false;
  }
}

export function AccountPrompt() {
  const { status, walletAddress } = useAuth();
  const wallet = status === 'ready' ? walletAddress : null;
  const { needsSetup, isUpdate } = useAccount(wallet);
  const { openWalletAt, open } = useWalletPanel();
  const [later, setLater] = useState(() => (wallet ? laterFor(wallet) : false));
  const primary = useRef<HTMLButtonElement>(null);
  useEffect(() => setLater(wallet ? laterFor(wallet) : false), [wallet]);

  const show = Boolean(wallet) && needsSetup;
  const modal = show && !later && !open;
  useEffect(() => {
    if (modal) primary.current?.focus();
  }, [modal]);
  if (!show || !wallet) return null;

  const start = () => openWalletAt(isUpdate ? '/role?update=1' : '/role');
  const dismiss = () => {
    try {
      sessionStorage.setItem(LATER + wallet, '1');
    } catch {
      // no session storage: closed until the page reloads
    }
    setLater(true);
  };

  if (!modal) {
    // After "Later" (or while the panel is open): the note stays as a banner with the same action
    return later ? (
      <div role="status" className="consent-gate" data-testid="account-later">
        <span>{WEB_COPY.prompt.laterNote}</span>
        <button type="button" onClick={start}>
          {WEB_COPY.prompt.primary}
        </button>
      </div>
    ) : null;
  }
  return (
    <div className={styles.layer}>
      <m.div className={styles.backdrop} aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: DURATION.backdrop, ease: EASE } }} />
      <m.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
        className={styles.card}
        data-testid="account-prompt"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { duration: DURATION.stateChange, ease: EASE_OUT } }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') dismiss();
        }}
      >
        <h2 id="account-title" className={styles.title}>
          {WEB_COPY.prompt.title}
        </h2>
        <p className={styles.body}>{isUpdate ? WEB_COPY.prompt.update : WEB_COPY.prompt.body}</p>
        <ol className={styles.steps}>
          {WEB_COPY.prompt.steps.map((label, i) => (
            <li key={label} className={styles.step}>
              <span className={styles.num} aria-hidden>
                {i + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
        <button ref={primary} type="button" className={styles.primary} onClick={start}>
          {WEB_COPY.prompt.primary}
        </button>
        <button type="button" className={styles.later} onClick={dismiss}>
          {WEB_COPY.prompt.later}
        </button>
        <p className={styles.note}>{WEB_COPY.prompt.laterNote}</p>
      </m.div>
    </div>
  );
}
