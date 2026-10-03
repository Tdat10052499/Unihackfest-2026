// Wallet panel (WebWalletPanel board): a popover under the wallet button, like a wallet extension inside the page.
// Signed out → Continue with Google. Signed in → wallet home. The confirm state is W4 (see WalletPanelContext).
import { useEffect, useRef, useState } from 'react';
import { m } from 'motion/react';
import { USD_VND_RATE_DATE } from '@ned/core/constants.ts';
import { usdcFromUnits, vndFromUnits, formatUsdc } from '@ned/core/milestone/format.ts';
import type { ActionKind, FundView, Region } from '@ned/core/milestone/view.ts';
import { useAuth } from '../auth/AuthProvider.tsx';
import { env } from '../config.ts';
import { useFunds, useUsername } from '../hooks/queries.ts';
import { useRegion } from '../hooks/region.ts';
import { useWalletSummary } from '../hooks/summary.ts';
import { mobileHref, shortAddress } from '../lib/format.ts';
import { popover } from '../motion.ts';
import { Avatar } from './Avatar.tsx';
import { Icon, MailIcon, PhoneIcon, type IconName } from './icons.tsx';
import { Logo } from './Logo.tsx';
import { useWalletPanel } from './WalletPanelContext.tsx';
import styles from './WalletPanel.module.css';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function WalletPanel({ id }: { id: string }) {
  const { status, walletAddress } = useAuth();
  const { setOpen, triggerRef } = useWalletPanel();
  const ref = useRef<HTMLDivElement>(null);
  const signedIn = status === 'ready' && walletAddress;

  // Focus the first control on open; Escape closes and returns focus to the wallet button; Tab stays inside
  useEffect(() => {
    const panel = ref.current;
    // Focus the first control, or the panel itself when it has none (sign-in not configured)
    (panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panel.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panel?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [setOpen, triggerRef]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <m.div
      ref={ref}
      id={id}
      className={styles.popover}
      role="dialog"
      aria-modal="false"
      tabIndex={-1}
      aria-label={signedIn ? 'Your N.E.D Wallet' : 'Sign in with N.E.D Wallet'}
      variants={popover}
      initial="closed"
      animate="open"
      exit="exit"
    >
      <div className={styles.panel}>{signedIn ? <Home wallet={walletAddress} onClose={close} /> : <SignedOut />}</div>
    </m.div>
  );
}

function SignedOut() {
  const { status, error, login } = useAuth();
  const [starting, setStarting] = useState(false);
  const busy = starting || status === 'initializing' || status === 'setting-up';
  const start = async () => {
    setStarting(true);
    try {
      await login(); // leaves the page for Google; comes back to the same URL
    } finally {
      setStarting(false);
    }
  };
  return (
    <div className={styles.out}>
      <div className={styles.brandRow}>
        <Logo size={40} />
        <div>
          <h2 className={styles.title}>Sign in with N.E.D Wallet</h2>
          <div className={styles.caption}>The same wallet as on your phone</div>
        </div>
      </div>
      <button type="button" className={styles.primary} onClick={start} disabled={busy || status === 'unconfigured'}>
        <MailIcon />
        {status === 'setting-up' ? 'Setting up your wallet…' : starting ? 'Opening Google…' : 'Continue with Google'}
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <ul className={styles.checks}>
        {[
          'Pick the Google account you use in the N.E.D app. Your wallet, profile and contracts come with it.',
          'Nothing to install. This panel works like a wallet extension, inside the page.',
          'N.E.D never holds your money. Every step that moves it asks you to confirm here.',
        ].map((text) => (
          <li key={text}>
            <Icon name="check" color="var(--success-ink)" width={2.4} />
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <p className={styles.foot}>New to N.E.D? Sign in the same way. We set up your wallet and ask where you live, so you see the right money view.</p>
    </div>
  );
}

function Home({ wallet, onClose }: { wallet: string; onClose(): void }) {
  const { email, logout } = useAuth();
  const { setOpen } = useWalletPanel();
  const username = useUsername(wallet).data ?? null;
  const { region } = useRegion(wallet);
  const handle = username ? `@${username}` : shortAddress(wallet);

  const signOut = async () => {
    setOpen(false);
    await logout();
  };

  return (
    <>
      <div className={styles.head}>
        <Avatar seed={wallet} size={40} decorative />
        <div className={styles.headText}>
          <p className={styles.name}>{handle}</p>
          <div className={styles.meta}>
            <span className={styles.mono} title={wallet}>
              {shortAddress(wallet)}
            </span>
            {email && (
              <>
                <span aria-hidden>·</span>
                <span className={styles.ellipsis}>Google · {email}</span>
              </>
            )}
          </div>
        </div>
        <button type="button" className={styles.close} aria-label="Close wallet panel" onClick={onClose}>
          <Icon name="close" color="var(--ink-2)" />
        </button>
      </div>
      <div className={styles.home}>
        <Hero wallet={wallet} region={region} />
        <Needs wallet={wallet} region={region} />
        <QuickActions username={username} region={region} />
        <div className={styles.footer}>
          <a className={styles.fullWallet} href={mobileHref(env.mobileOrigin, '/')} target="_blank" rel="noreferrer">
            <PhoneIcon />
            Open the full wallet
          </a>
          <button type="button" className={styles.signOut} onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}

const rateDay = new Date(`${USD_VND_RATE_DATE}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const vnd = (units: bigint) => vndFromUnits(units).toLocaleString('en-US');

function Hero({ wallet, region }: { wallet: string; region: Region }) {
  const s = useWalletSummary(wallet, region);
  const vn = region === 'vn';
  const loading = (value: string) => (s.loading ? <span className={styles.skeleton} aria-label="Loading" /> : value);
  const contracts = `${s.lockedForMeContracts} contract${s.lockedForMeContracts === 1 ? '' : 's'}`;
  return (
    <div className={styles.hero}>
      <div className={styles.heroTop}>
        <div style={{ minWidth: 0 }}>
          <div className={styles.heroLabel}>{vn ? 'Locked for you' : 'USDC balance'}</div>
          <div className={styles.heroValue}>
            {s.loading ? (
              <span className={styles.skeleton} aria-label="Loading" />
            ) : (
              <>
                {vn ? vnd(s.lockedForMe) : usdcFromUnits(s.usdcUnits ?? 0n)}
                <span className={styles.heroUnit}>{vn ? ' VND' : ' USDC'}</span>
              </>
            )}
          </div>
          <div className={styles.heroSub}>
            {vn ? `Estimate · $${usdcFromUnits(s.lockedForMe)} · ${contracts} · rate of ${rateDay}` : 'Devnet test money'}
          </div>
        </div>
        {vn ? <FlagVn /> : <FlagUs />}
      </div>
      <dl className={styles.stats}>
        <div>
          {/* The board says "Received this month"; the chain stores no release date, so W1 shows the all-time total */}
          <dt>{vn ? 'Released to you' : 'Locked in your contracts'}</dt>
          <dd>{loading(vn ? `≈ ${vnd(s.releasedToMe)} VND` : formatUsdc(s.lockedByMe + s.lockedForMe))}</dd>
        </div>
        <div>
          <dt>Active contracts</dt>
          <dd>{loading(String(s.activeContracts))}</dd>
        </div>
      </dl>
    </div>
  );
}

const NEED_LOOK: Partial<Record<ActionKind, { icon: IconName; bg: string; ink: string }>> = {
  submit: { icon: 'submit', bg: 'var(--purple-bg)', ink: 'var(--purple-ink)' },
  approve: { icon: 'review', bg: 'var(--info-bg)', ink: 'var(--info-ink)' },
  releaseNow: { icon: 'release', bg: 'var(--success-bg)', ink: 'var(--success-ink)' },
  refundNow: { icon: 'release', bg: 'var(--warning-bg)', ink: 'var(--warning-ink)' },
  lock: { icon: 'lock', bg: 'var(--warning-bg)', ink: 'var(--warning-ink)' },
};
const DEFAULT_LOOK = { icon: 'check' as IconName, bg: 'var(--purple-bg)', ink: 'var(--purple-ink)' };

function Needs({ wallet, region }: { wallet: string; region: Region }) {
  const { funds, loading } = useFunds(wallet, region);
  const needs = funds.filter((f: FundView) => f.needsMyAction && f.nextAction).slice(0, 3);
  return (
    <section aria-labelledby="needs-label">
      <h3 id="needs-label" className={styles.sectionLabel}>
        Needs your action
      </h3>
      {/* W1 placeholder: rows open the contract page once it exists (W2/W3) */}
      <ul className={styles.needs}>
        {needs.map((f) => {
          const look = NEED_LOOK[f.nextAction!.kind] ?? DEFAULT_LOOK;
          return (
            <li key={f.address} className={styles.need}>
              <span className={styles.needIcon} style={{ background: look.bg }} aria-hidden>
                <Icon name={look.icon} size={15} color={look.ink} />
              </span>
              <span className={styles.needText}>
                <span className={styles.needTitle}>{f.nextAction!.label}</span>
                <span className={styles.needSub}>{f.title}</span>
              </span>
            </li>
          );
        })}
        {!needs.length && <li className={styles.empty}>{loading ? 'Checking your contracts…' : 'Nothing needs you right now.'}</li>}
      </ul>
    </section>
  );
}

function QuickActions({ username, region }: { username: string | null; region: Region }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    if (!username) return;
    try {
      await navigator.clipboard.writeText(`@${username}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked: nothing to do
    }
  };
  const dot = (icon: IconName, filled: boolean) => (
    <span className={`${styles.quickDot} ${filled ? styles.quickDotFilled : ''}`} aria-hidden>
      <Icon name={icon} size={15} color={filled ? '#FFFFFF' : 'var(--ink)'} />
    </span>
  );
  // Until the Workspace has these pages (W2+), they open the phone app (D16 host rule)
  return (
    <div role="group" aria-label="Quick actions" className={styles.quick}>
      {region === 'vn' ? (
        <>
          <button type="button" className={styles.quickItem} onClick={share} disabled={!username}>
            {dot('share', true)}
            <span aria-live="polite">{copied ? 'Copied' : username ? `Share @${username}` : 'Share your @name'}</span>
          </button>
          <a className={styles.quickItem} href={mobileHref(env.mobileOrigin, '/history')} target="_blank" rel="noreferrer">
            {dot('records', false)}
            Records
          </a>
        </>
      ) : (
        <>
          <a className={styles.quickItem} href={mobileHref(env.mobileOrigin, '/')} target="_blank" rel="noreferrer">
            {dot('plus', true)}
            New contract
          </a>
          <a className={styles.quickItem} href={mobileHref(env.mobileOrigin, '/receive')} target="_blank" rel="noreferrer">
            {dot('receive', false)}
            Receive
          </a>
        </>
      )}
    </div>
  );
}

function FlagVn() {
  return (
    <div className={styles.flag} title="Vietnamese đồng (VND)">
      <svg width="32" height="32" viewBox="0 0 20 20" role="img" aria-label="Flag of Vietnam" style={{ display: 'block' }}>
        <rect width="20" height="20" fill="#DA251D" />
        <polygon points="10.00,4.00 11.35,8.15 15.71,8.15 12.18,10.71 13.53,14.85 10.00,12.29 6.47,14.85 7.82,10.71 4.29,8.15 8.65,8.15" fill="#FFCD00" />
      </svg>
    </div>
  );
}

function FlagUs() {
  const stripes = Array.from({ length: 13 }, (_, i) => i);
  const stars: [number, number][] = [[2.55, 2.2], [5.85, 2.2], [4.2, 5.4], [7.5, 5.4], [2.55, 8.6], [5.85, 8.6]];
  return (
    <div className={styles.flag} title="US dollar · USDC is a dollar stablecoin">
      <svg width="32" height="32" viewBox="0 0 20 20" role="img" aria-label="Flag of the United States" style={{ display: 'block' }}>
        {stripes.map((i) => (
          <rect key={i} y={(i * 20) / 13} width="20" height={20 / 13} fill={i % 2 ? '#FFFFFF' : '#B22234'} />
        ))}
        <rect width="10" height="10.769" fill="#3C3B6E" />
        {stars.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="0.6" fill="#FFFFFF" />
        ))}
      </svg>
    </div>
  );
}
