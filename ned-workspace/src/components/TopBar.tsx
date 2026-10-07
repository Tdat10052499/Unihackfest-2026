// Top bar (WebSignIn / WebWorkspace boards): logo, Devnet badge and the wallet button that opens the panel.
import { Link } from 'react-router';
import { AnimatePresence, m } from 'motion/react';
import { DURATION, EASE, EXIT_RATIO } from '../motion.ts';
import { useAuth } from '../auth/AuthProvider.tsx';
import { useRegion } from '../hooks/region.ts';
import { useUsername } from '../hooks/queries.ts';
import { shortAddress } from '../lib/format.ts';
import { Avatar } from './Avatar.tsx';
import { DevnetBadge } from './DevnetBadge.tsx';
import { Icon, WalletIcon } from './icons.tsx';
import { Logo } from './Logo.tsx';
import { NotificationBell } from './NotificationBell.tsx';
import { WalletExtension } from './WalletExtension.tsx';
import { WalletPanel } from './WalletPanel.tsx';
import { useWalletPanel } from './WalletPanelContext.tsx';
import styles from './TopBar.module.css';
import panelStyles from './WalletPanel.module.css';

export const PANEL_ID = 'ned-wallet-panel';

export function TopBar() {
  const { status, walletAddress } = useAuth();
  const { open, toggle, triggerRef, request, walletMounted } = useWalletPanel();
  const signedIn = status === 'ready' && walletAddress;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <Logo />
          <span className={styles.word}>Workspace</span>
        </Link>
        <div className={styles.spacer} />
        <DevnetBadge />
        {signedIn ? <NotificationBell /> : null}
        <div className={styles.anchor}>
          {signedIn ? (
            <WalletButton wallet={walletAddress} open={open} onClick={toggle} triggerRef={triggerRef} />
          ) : (
            <button
              ref={triggerRef}
              type="button"
              className={styles.signIn}
              aria-expanded={open}
              aria-haspopup="dialog"
              aria-controls={open ? PANEL_ID : undefined}
              onClick={toggle}
            >
              <WalletIcon />
              {status === 'setting-up' ? 'Setting up your wallet…' : 'Sign in with N.E.D Wallet'}
              <Icon name="chevronDown" size={14} width={2.4} />
            </button>
          )}
          <AnimatePresence>
            {open && request && (
              <m.div
                key="backdrop"
                className={panelStyles.backdrop}
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: DURATION.backdrop, ease: EASE } }}
                exit={{ opacity: 0, transition: { duration: DURATION.backdrop * EXIT_RATIO, ease: EASE } }}
              />
            )}
          </AnimatePresence>
          {/* Signed in: the wallet extension (the phone app, W6) — mounted on first open, then kept */}
          {signedIn && walletMounted ? <WalletExtension wallet={walletAddress} id={PANEL_ID} /> : null}
          {/* Signed out, or a confirm request from a Workspace page: the panel's own states */}
          <AnimatePresence>{open && (!signedIn || request) && <WalletPanel key="panel" id={request ? `${PANEL_ID}-confirm` : PANEL_ID} />}</AnimatePresence>
        </div>
      </div>
    </header>
  );
}

function WalletButton({ wallet, open, onClick, triggerRef }: {
  wallet: string;
  open: boolean;
  onClick(): void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const username = useUsername(wallet).data;
  const { region } = useRegion(wallet);
  const name = username ? `@${username}` : shortAddress(wallet);
  return (
    <button
      ref={triggerRef}
      type="button"
      className={styles.wallet}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-controls={open ? PANEL_ID : undefined}
      aria-label={`Your wallet, ${name}`}
      onClick={onClick}
    >
      <Avatar seed={wallet} decorative />
      <span className={styles.who}>
        <span className={styles.handle}>{name}</span>
        <span className={styles.sub}>{region === 'vn' ? 'Vietnam view · VND' : 'USDC wallet'}</span>
      </span>
      <Icon name="chevronDown" size={14} width={2.4} color="var(--ink-2)" />
    </button>
  );
}
