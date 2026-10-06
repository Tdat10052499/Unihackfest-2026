// The bell of U3 on the web, in the Workspace TopBar and the Jobs navbar: the signed-in wallet's notices, Today and
// Earlier, newest first. Opening it marks them seen (in this browser only). Escape and a click outside close it.
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { formatDeadline } from '@ned/core/milestone/format.ts';
import { useAuth } from '../auth/AuthProvider.tsx';
import { useRegion } from '../hooks/region.ts';
import { useNotices } from '../hooks/notices.ts';
import { useChainTime } from '../hooks/useChainTime.ts';
import { EMPTY_TEXT, groupByDay, type StoredNotice } from '../lib/noticeStore.ts';
import { Icon } from './icons.tsx';
import styles from './NotificationBell.module.css';

export function NotificationBell({ onLight = false }: { onLight?: boolean }) {
  const { status, walletAddress } = useAuth();
  const wallet = status === 'ready' ? walletAddress : null;
  const { region } = useRegion(wallet);
  const { items, unread, seeAll } = useNotices(wallet, region === 'vn');
  const now = useChainTime();
  if (!wallet) return null;
  return <BellView items={items} unread={unread} now={now} onOpen={seeAll} onLight={onLight} />;
}

export function BellView({ items, unread, now, onOpen, onLight = false }: { items: StoredNotice[]; unread: number; now: number; onOpen(): void; onLight?: boolean }) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<StoredNotice[]>(items);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !button.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      // Show the unread dots for this opening, then mark everything seen
      setShown(items);
      onOpen();
    }
    setOpen(!open);
  };

  return (
    <div className={styles.anchor}>
      <button
        ref={button}
        type="button"
        className={`${styles.bell} ${onLight ? styles.onLight : ''}`}
        aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={toggle}
      >
        <Icon name="bell" size={19} />
        {unread ? <span className={styles.badge} aria-hidden>{unread > 9 ? '9+' : unread}</span> : null}
      </button>
      {open ? (
        <div ref={panel} id={id} role="dialog" aria-label="Notifications" className={styles.panel}>
          <div className={styles.head}>Notifications</div>
          {shown.length ? (
            groupByDay(shown, now).map((g) => (
              <div key={g.label}>
                <div className={styles.group}>{g.label}</div>
                {g.items.map((n) => (
                  <Link key={n.id} to={n.href} className={styles.item} onClick={() => setOpen(false)} data-testid="notice">
                    <span className={styles.title}>
                      {n.seen ? null : <span className={styles.dot} aria-label="New" />}
                      {n.title}
                    </span>
                    <span className={styles.message}>{n.message}</span>
                    <span className={styles.time}>{formatDeadline(n.at)}</span>
                  </Link>
                ))}
              </div>
            ))
          ) : (
            <p className={styles.empty}>{EMPTY_TEXT}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
