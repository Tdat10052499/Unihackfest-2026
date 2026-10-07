// N.E.D Jobs site frame v4 (D28; prompts-hub-v4.md V4, V9; boards WebJobs, WebJobsFind, WebJobsLegal): a white
// sticky header that gains a shadow and shrinks on scroll (.hb-hdr / .hb-hdr-in), the page, and the night footer
// (with the CTA band on the Overview). Its own route tree under /jobs, sharing sign-in, the wallet extension (D23) and
// @ned/core with the Workspace. Readable signed out; "Post a job" only for a signed-in wallet outside the Vietnam view
// (D18). Legal is reached from the footer only, never the navbar.
import type { ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { AnimatePresence, m } from 'motion/react';
import { useAuth } from '../auth/AuthProvider.tsx';
import { PANEL_ID } from '../components/TopBar.tsx';
import { ConsentGate } from '../components/ConsentGate.tsx';
import { DeviceKeyGate } from '../components/DeviceKeyGate.tsx';
import { NotificationBell } from '../components/NotificationBell.tsx';
import { RegionPrompt } from '../components/RegionPrompt.tsx';
import { WalletExtension } from '../components/WalletExtension.tsx';
import { WalletPanel } from '../components/WalletPanel.tsx';
import { useWalletPanel } from '../components/WalletPanelContext.tsx';
import panelStyles from '../components/WalletPanel.module.css';
import { useRegion } from '../hooks/region.ts';
import { useUsername } from '../hooks/queries.ts';
import { shortAddress } from '../lib/format.ts';
import { DURATION, EASE, EXIT_RATIO } from '../motion.ts';
import { HubButton } from './components/HubButton.tsx';
import { HubIcon } from './components/HubIcon.tsx';
import { ProfileMenu, viewLabelFor, type ProfileMenuProps } from './ProfileMenu.tsx';
import { legalHref } from './pages/Legal.tsx';
import hub from './hub.module.css';
import './motion.css';

/** The signed-in wallet and its money view, for every Jobs page */
export function useHubViewer() {
  const { status, walletAddress } = useAuth();
  const wallet = status === 'ready' && walletAddress ? walletAddress : null;
  const { region } = useRegion(wallet);
  const username = useUsername(wallet).data ?? null;
  return { wallet, signedIn: Boolean(wallet), vn: region === 'vn', name: wallet ? (username ? `@${username}` : shortAddress(wallet)) : null, status };
}

/** V9 disclaimer line per view (board WebJobs) */
export const FOOT = {
  vn: 'Devnet demo with test money. Listings, budgets and applications are read from Solana; N.E.D stores nothing. VND amounts are estimates at 26,019.5 VND per USD (2 Oct 2026); the payout partner is simulated.',
  intl: 'Devnet demo with test money. Listings, budgets and applications are read from Solana; N.E.D stores nothing.',
};

/** V9 CTA band, Overview only */
export const CTA = {
  client: ['Hire with the money on the table, ', 'and no fee from N.E.D'],
  other: ['Work with the money on the table, ', 'and no fee from N.E.D'],
  checks: ['Budget locked before posting', 'Checkable on Solana Explorer'],
  text: 'N.E.D holds no funds and charges no fee in this version. The money waits in the program until the work is accepted or a deadline passes.',
} as const;

/** Footer legal links: the hub's own Legal page (H4). The Workspace pages keep LEGAL_LINKS (/wallet/…) */
export const FOOT_LEGAL = [
  { label: 'Terms of use', to: legalHref('terms') },
  { label: 'Privacy', to: legalHref('privacy') },
  { label: 'Disclosures', to: legalHref('disclosures') },
] as const;

export function JobsLayout() {
  const location = useLocation();
  const { wallet, signedIn, vn, name, status } = useHubViewer();
  const { open, setOpen, triggerRef, request, walletMounted, openWalletAt } = useWalletPanel();
  const next = encodeURIComponent(`${location.pathname}${location.search}`);

  return (
    <div className={`${hub.hub} hb-root`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <JobsHeader
        wallet={wallet}
        name={name}
        vn={vn}
        status={status}
        next={next}
        onOpenWallet={() => openWalletAt('/')}
        onMenuOpen={() => setOpen(false)}
        buttonRef={(el) => {
          triggerRef.current = el;
        }}
        bell={wallet ? <NotificationBell onLight /> : null}
      >
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
        {wallet && walletMounted ? <WalletExtension wallet={wallet} id={PANEL_ID} /> : null}
        <AnimatePresence>{open && request && <WalletPanel key="panel" id={`${PANEL_ID}-confirm`} />}</AnimatePresence>
      </JobsHeader>
      <RegionPrompt />
      {/* Key sync (D22): a selected applicant reads the contract brief through this computer's device key */}
      <DeviceKeyGate />
      <ConsentGate className="consent-gate" />
      <AnimatePresence mode="wait" initial={false}>
        <m.main
          id="main"
          key={location.pathname}
          className={hub.main}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: DURATION.screenFade, ease: EASE } }}
          exit={{ opacity: 0, transition: { duration: DURATION.screenFade * EXIT_RATIO, ease: EASE } }}
        >
          <Outlet />
        </m.main>
      </AnimatePresence>
      <JobsFooter vn={vn} client={signedIn && !vn} cta={location.pathname === '/jobs'} />
    </div>
  );
}

export interface JobsHeaderProps {
  wallet: string | null;
  name: string | null;
  vn: boolean;
  status: string;
  /** The current page, URL-encoded, for /sign-in?next= */
  next: string;
  onOpenWallet(): void;
  onMenuOpen?(): void;
  buttonRef?: ProfileMenuProps['buttonRef'];
  bell?: ReactNode;
  /** The wallet extension and confirm panel, anchored under the profile button */
  children?: ReactNode;
}

/** V4 header: logo, Overview · Find jobs (never Legal), Devnet chip, Post a job (client), Sign in or the profile menu */
export function JobsHeader({ wallet, name, vn, status, next, onOpenWallet, onMenuOpen, buttonRef, bell, children }: JobsHeaderProps) {
  const tab = ({ isActive }: { isActive: boolean }) => `${hub.tab} ${isActive ? hub.tabActive : ''}`;
  return (
    <header className={`${hub.header} hb-hdr`}>
      <div className={`${hub.container} ${hub.headerInner} hb-hdr-in`}>
        <Link to="/jobs" className={hub.brand} aria-label="N.E.D Jobs, overview">
          <span className={hub.mark} aria-hidden>
            N.E.D
          </span>
          <span className={hub.brandWord}>Jobs</span>
        </Link>
        <nav aria-label="Jobs" className={hub.tabs}>
          <NavLink to="/jobs" end className={tab}>
            Overview
          </NavLink>
          <NavLink to="/jobs/find" className={tab}>
            Find jobs
          </NavLink>
        </nav>
        <div className={hub.spacer} />
        <span className={hub.devnet}>
          <span className={hub.devnetDot} aria-hidden />
          Devnet · test money
        </span>
        {wallet && !vn ? (
          <HubButton variant="purple" to="/jobs/new" arrow style={{ height: 42 }}>
            Post a job
          </HubButton>
        ) : null}
        {bell}
        <div className={hub.anchor}>
          {wallet && name ? (
            <ProfileMenu wallet={wallet} name={name} viewLabel={viewLabelFor(vn)} buttonRef={buttonRef} onMenuOpen={onMenuOpen} onOpenWallet={onOpenWallet} />
          ) : (
            <Link to={`/sign-in?next=${next}`} className={hub.signIn}>
              {status === 'setting-up' || status === 'initializing' ? 'Opening your wallet…' : 'Sign in'}
            </Link>
          )}
          {children}
        </div>
      </div>
    </header>
  );
}

export function JobsFooter({ vn, client, cta = false }: { vn: boolean; client: boolean; cta?: boolean }) {
  const heading = client ? CTA.client : CTA.other;
  return (
    <footer className={hub.footer}>
      {cta ? (
        <div className={`${hub.container} ${hub.cta} rv`} data-testid="cta-band">
          <div className={hub.ctaMain}>
            <h2 className={hub.ctaTitle}>
              {heading[0]}
              <span className={hub.ctaTone}>{heading[1]}</span>
            </h2>
            <div className={hub.ctaChecks}>
              {CTA.checks.map((c) => (
                <span key={c} className={hub.ctaCheck}>
                  <span className={hub.ctaDot} aria-hidden>
                    <HubIcon name="check" size={10} width={3.4} />
                  </span>
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div className={hub.ctaSide}>
            <p className={hub.ctaText}>{CTA.text}</p>
            <div className={hub.ctaButtons}>
              <HubButton variant="white" to="/jobs/find" arrow>
                Find jobs
              </HubButton>
              {client ? (
                <HubButton variant="purple" to="/jobs/new">
                  Post a job
                </HubButton>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <div className={hub.container}>
        <div className={hub.footRow} style={cta ? undefined : { boxShadow: 'none' }}>
          <Link to="/jobs" className={hub.brand} aria-label="N.E.D Jobs, overview">
            <span className={`${hub.mark} ${hub.markPurple}`} aria-hidden>
              N.E.D
            </span>
            <span className={hub.brandWord}>Jobs</span>
          </Link>
          <nav aria-label="Footer" className={hub.footNav}>
            <Link to="/jobs" className={`${hub.footLink} hb-ul`}>
              Overview
            </Link>
            <Link to="/jobs/find" className={`${hub.footLink} hb-ul`}>
              Find jobs
            </Link>
            {vn ? null : (
              <Link to="/jobs/new" className={`${hub.footLink} hb-ul`}>
                Post a job
              </Link>
            )}
            <Link to="/" className={`${hub.footLink} hb-ul`}>
              Workspace
            </Link>
            <Link to={legalHref()} className={`${hub.footLink} hb-ul`}>
              Legal
            </Link>
          </nav>
          <span className={hub.footStudent}>Student project · UniHackFest 2026</span>
        </div>
        <div className={hub.footBottom}>
          <span className={hub.footNote}>{vn ? FOOT.vn : FOOT.intl}</span>
          <nav aria-label="Legal" className={hub.footLegal}>
            {FOOT_LEGAL.map((l) => (
              <Link key={l.to} to={l.to} className="hb-ul">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
