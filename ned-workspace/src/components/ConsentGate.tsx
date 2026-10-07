// P4: after sign-in, a wallet with no valid consent sees this banner, and the wallet panel opens once per session at
// /consent (the phone app's consent screen, same record). Signing actions stay blocked in confirm() until it is given.
import { useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider.tsx';
import { CONSENT_NEEDED, useConsent } from '../hooks/consent.ts';
import { useWalletPanel } from './WalletPanelContext.tsx';

const ASKED = 'ned.consentAsked.';

export function ConsentGate({ className, buttonClassName }: { className?: string; buttonClassName?: string }) {
  const { status, walletAddress } = useAuth();
  const wallet = status === 'ready' ? walletAddress : null;
  const consented = useConsent(wallet);
  const { openWalletAt } = useWalletPanel();
  useEffect(() => {
    if (!wallet || consented) return;
    try {
      if (sessionStorage.getItem(ASKED + wallet)) return;
      sessionStorage.setItem(ASKED + wallet, '1');
    } catch {
      // no session storage: ask anyway
    }
    openWalletAt('/consent');
  }, [wallet, consented, openWalletAt]);
  if (!wallet || consented) return null;
  return (
    <div role="status" className={className} data-testid="consent-gate">
      <span>{CONSENT_NEEDED}</span>
      <button type="button" className={buttonClassName} onClick={() => openWalletAt('/consent')}>
        Review and agree
      </button>
    </div>
  );
}
