// N.E.D Jobs site frame (D28; boards WebJobs, WebJobsFind; appendix H.5, H.6, H.11): lavender navbar, the page,
// dark footer. Its own route tree under /jobs, sharing sign-in, the wallet extension (D23) and @ned/core with the
// Workspace. Readable signed out; "Post a job" only for a signed-in wallet outside the Vietnam view (D18).
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { AnimatePresence, m } from 'motion/react';
import { useAuth } from '../auth/AuthProvider.tsx';
import { PANEL_ID } from '../components/TopBar.tsx';
import { ConsentGate } from '../components/ConsentGate.tsx';
import { DeviceKeyGate } from '../components/DeviceKeyGate.tsx';
import { LEGAL_LINKS } from '../components/LegalLinks.tsx';
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
import { ProfileMenu, viewLabelFor } from './ProfileMenu.tsx';
import hub from './hub.module.css';

/** The signed-in wallet and its money view, for every Jobs page */
export function useHubViewer() {
  const { status, walletAddress } = useAuth();
  const wallet = status === 'ready' && walletAddress ? walletAddress : null;
  const { region } = useRegion(wallet);
  const username = useUsername(wallet).data ?? null;
  return { wallet, signedIn: Boolean(wallet), vn: region === 'vn', name: wallet ? (username ? `@${username}` : shortAddress(wallet)) : null, status };
}

export const FOOT = {
  vn: 'Devnet demo with test money. Listings, budgets and applications are read from Solana; N.E.D stores nothing. VND amounts are estimates at 26,019.5 VND per USD (2 Oct 2026); the payout partner is simulated. Your pitch is public on Solana.',
  intl: 'Devnet demo with test money. Listings, budgets and applications are read from Solana; N.E.D stores nothing. Filters live in the page address, so a search can be shared.',
};

export function JobsLayout() {
  const location = useLocation();
  const { wallet, signedIn, vn, name, status } = useHubViewer();
  const { open, setOpen, triggerRef, request, walletMounted, openWalletAt } = useWalletPanel();
  const next = encodeURIComponent(`${location.pathname}${location.search}`);
  const tab = ({ isActive }: { isActive: boolean }) => `${hub.tab} ${isActive ? hub.tabActive : ''}`;

  return (
    <div className={hub.hub}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={hub.header}>
        <div className={`${hub.container} ${hub.headerInner}`}>
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
          {signedIn && !vn ? (
            <HubButton variant="purple" to="/jobs/new">
              Post a job
              <HubIcon name="arrowUp" size={15} />
            </HubButton>
          ) : null}
          {wallet ? <NotificationBell onLight /> : null}
          <div className={hub.anchor}>
            {wallet && name ? (
              <ProfileMenu
                wallet={wallet}
                name={name}
                viewLabel={viewLabelFor(vn)}
                buttonRef={(el) => {
                  triggerRef.current = el;
                }}
                onMenuOpen={() => setOpen(false)}
                onOpenWallet={() => openWalletAt('/')}
              />
            ) : (
              <Link to={`/sign-in?next=${next}`} className={hub.profile} style={{ padding: '0 18px', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
                {status === 'setting-up' || status === 'initializing' ? 'Opening your wallet…' : 'Sign in'}
              </Link>
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
            {wallet && walletMounted ? <WalletExtension wallet={wallet} id={PANEL_ID} /> : null}
            <AnimatePresence>{open && request && <WalletPanel key="panel" id={`${PANEL_ID}-confirm`} />}</AnimatePresence>
          </div>
        </div>
      </header>
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
      <JobsFooter vn={vn} signedIn={signedIn} />
    </div>
  );
}

function JobsFooter({ vn, signedIn }: { vn: boolean; signedIn: boolean }) {
  const { openWalletAt } = useWalletPanel();
  return (
    <footer className={hub.footer}>
      <div className={`${hub.container} ${hub.footerTop}`}>
        <div className={hub.footerBrand}>
          <div className={hub.brand}>
            <span className={`${hub.mark} ${hub.markPurple}`} aria-hidden>
              N.E.D
            </span>
            <span className={hub.brandWord} style={{ color: '#fff' }}>
              Jobs
            </span>
          </div>
          <p className={hub.footerAbout}>
            Jobs with budgets locked on Solana. N.E.D does not choose, vet or employ anyone, holds no funds and charges no fee in this version.
          </p>
        </div>
        <nav aria-label="Jobs links" className={hub.footerCol}>
          <span className={hub.footerHead}>Jobs</span>
          <Link to="/jobs/find" className={hub.footerLink}>
            Find jobs
          </Link>
          {vn ? null : (
            <Link to="/jobs/new" className={hub.footerLink}>
              Post a job
            </Link>
          )}
        </nav>
        <nav aria-label="Workspace links" className={hub.footerCol}>
          <span className={hub.footerHead}>Workspace</span>
          <Link to="/" className={hub.footerLink}>
            Overview
          </Link>
          {signedIn ? (
            <button type="button" className={hub.footerLink} onClick={() => openWalletAt('/records')}>
              Records
            </button>
          ) : null}
        </nav>
        <nav aria-label="Legal" className={hub.footerCol}>
          <span className={hub.footerHead}>Legal</span>
          {LEGAL_LINKS.map((l) => (
            <a key={l.href} href={l.href} className={hub.footerLink}>
              {l.label}
            </a>
          ))}
        </nav>
      </div>
      <div className={`${hub.container} ${hub.footerNote}`}>{vn ? FOOT.vn : FOOT.intl}</div>
    </footer>
  );
}
