// Wallet extension (WebWalletPanel board, workspace-plan W6, decision D23): signed in, the panel IS the phone app —
// the ned-wallet web build at /wallet on this origin, in an iframe. Same origin, so it shares the Dynamic session, the
// contract keys and this computer's device key with the Workspace (spike 4 Oct: signed in with no second login).
// The iframe loads on the first open only, then stays mounted (hidden) so the app keeps its state.
// Messages: from the app { ned-route, ned-escape }; to the app { ned-navigate }. Origin and source are checked both
// ways; no key, token or balance ever goes through postMessage.
import { useEffect, useRef, useState } from 'react';
import { m } from 'motion/react';
import { useUsername } from '../hooks/queries.ts';
import { shortAddress } from '../lib/format.ts';
import { DURATION, EASE, EASE_OUT } from '../motion.ts';
import { Avatar } from './Avatar.tsx';
import { Icon } from './icons.tsx';
import { useWalletPanel } from './WalletPanelContext.tsx';
import styles from './WalletExtension.module.css';

export const WALLET_BASE = '/wallet';

export function WalletExtension({ wallet, id }: { wallet: string; id: string }) {
  const { open, setOpen, triggerRef, request, walletRoute, setWalletRoute, pendingPath, clearPendingPath } = useWalletPanel();
  const frame = useRef<HTMLIFrameElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  // The first route comes from a deep link (openWalletAt) when there is one
  const [initialSrc] = useState(() => `${WALLET_BASE}${pendingPath && pendingPath !== '/' ? pendingPath : '/'}`);
  const firstPath = useRef(pendingPath);
  const username = useUsername(wallet).data ?? null;
  const visible = open && !request;

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Messages from the app in the frame
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      const data = e.data as { type?: string; path?: unknown; root?: unknown };
      if (data?.type === 'ned-route' && typeof data.path === 'string') setWalletRoute({ path: data.path, root: data.root === true });
      if (data?.type === 'ned-escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [setWalletRoute, setOpen, triggerRef]);

  // Deep links: the first one is the iframe's src; later ones navigate inside the running app
  useEffect(() => {
    if (!pendingPath) return;
    if (pendingPath === firstPath.current) {
      firstPath.current = null;
      clearPendingPath();
      return;
    }
    if (!loaded || !frame.current?.contentWindow) return;
    frame.current.contentWindow.postMessage({ type: 'ned-navigate', path: pendingPath }, window.location.origin);
    clearPendingPath();
  }, [pendingPath, loaded, clearPendingPath]);

  // Escape (focus in the Workspace) and a click outside close it, like the sign-in panel
  useEffect(() => {
    if (!visible) return;
    panel.current?.querySelector<HTMLElement>('button, a')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panel.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [visible, setOpen, triggerRef]);

  return (
    <m.div
      ref={panel}
      id={id}
      role="dialog"
      aria-modal="false"
      aria-label="N.E.D app"
      aria-hidden={!visible}
      className={`${styles.ext} ${visible ? '' : styles.hidden}`}
      initial={false}
      animate={visible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: visible ? DURATION.popover : DURATION.popover * 0.7, ease: visible ? EASE_OUT : EASE }}
    >
      <div className={styles.head}>
        {walletRoute.root ? (
          <span className={styles.mark} aria-hidden>
            N.E.D
          </span>
        ) : (
          <button type="button" className={styles.iconBtn} aria-label="Back" onClick={() => frame.current?.contentWindow?.history.back()}>
            <Icon name="back" size={18} />
          </button>
        )}
        <Avatar seed={wallet} size={28} decorative />
        <div className={styles.who}>
          <div className={styles.handle}>{username ? `@${username}` : shortAddress(wallet)}</div>
          <div className={styles.sub}>
            <span className={styles.dot} aria-hidden />
            Devnet · <span className={styles.mono}>{shortAddress(wallet)}</span>
          </div>
        </div>
        <a className={styles.iconBtn} href={`${WALLET_BASE}${walletRoute.path}`} target="_blank" rel="noopener" aria-label="Open in full view" title="Open in full view">
          <Icon name="external" size={17} />
        </a>
        <button type="button" className={styles.iconBtn} aria-label="Close wallet" onClick={close}>
          <Icon name="close" size={17} />
        </button>
      </div>
      <iframe ref={frame} title="N.E.D app" src={initialSrc} className={styles.frame} onLoad={() => setLoaded(true)} />
    </m.div>
  );
}
