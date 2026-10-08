// Page frame: top bar + content (max 1,280 px), or the phone gate below 900 px. Pages cross-fade (AnimatePresence,
// screen fade 200 ms, exit 70 %); each page then rises its first five blocks 40 ms apart (motion.ts).
import { useLocation, useOutlet } from 'react-router';
import { AnimatePresence, m } from 'motion/react';
import { DURATION, EASE, EXIT_RATIO } from '../motion.ts';
import { PhoneGate, useNarrowScreen } from './PhoneGate.tsx';
import { RegionPrompt } from './RegionPrompt.tsx';
import { AccountPrompt } from './AccountPrompt.tsx';
import { RoleGateNotice } from './RoleGate.tsx';
import { FEATURES } from '../config.ts';
import { ConsentGate } from './ConsentGate.tsx';
import { DeviceKeyGate } from './DeviceKeyGate.tsx';
import { LegalLinks } from './LegalLinks.tsx';
import { TopBar } from './TopBar.tsx';

export function Layout() {
  const location = useLocation();
  const outlet = useOutlet();
  if (useNarrowScreen()) return <PhoneGate />;
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <TopBar />
      {/* D30: the account prompt replaces the region prompt and the consent banner (consent v3 is in the agreement) */}
      {FEATURES.accountRoles ? <AccountPrompt /> : <RegionPrompt />}
      <DeviceKeyGate />
      {FEATURES.accountRoles ? <RoleGateNotice /> : <ConsentGate className="consent-gate" />}
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: DURATION.screenFade, ease: EASE } }}
          exit={{ opacity: 0, transition: { duration: DURATION.screenFade * EXIT_RATIO, ease: EASE } }}
        >
          {outlet}
        </m.div>
      </AnimatePresence>
      <footer className="ws-footer">
        <span>N.E.D Workspace · devnet pilot, test money only</span>
        <LegalLinks />
      </footer>
    </>
  );
}
