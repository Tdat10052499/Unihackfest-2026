// /c/:fund — the invite link (build-plan B1, workspace-plan W2). Decides FIRST where the link belongs, before touching
// the key or the address bar:
//   1. a phone-sized screen (< 900 px) → the mobile build, with the fragment (#k=…) intact (location.replace);
//   2. a computer: import #k= into this wallet's key storage, clear the fragment, open /contract/:fund.
//      Not signed in yet: keep the invite for this tab, clear the fragment, sign in, then import (PendingInvite).
import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { importKeyFromFragment } from '@ned/core/milestone/keys.ts';
import { useAuth } from '../auth/AuthProvider.tsx';
import { env } from '../config.ts';
import { contractKeyStorage, stashPendingInvite, takePendingInvite } from '../hooks/keyStore.ts';
import { isFundAddress } from '../hooks/useFund.ts';
import { decideInvite } from '../lib/invite.ts';

/** Removes the fragment from the address bar without a navigation (the key must not stay in history) */
const clearFragment = () => history.replaceState(history.state, '', location.pathname + location.search);

export function InviteRouter() {
  const { fund = '' } = useParams();
  const navigate = useNavigate();
  const { status, walletAddress } = useAuth();
  const decided = useRef(false);

  useEffect(() => {
    if (decided.current) return;
    const d = decideInvite({
      fund,
      validFund: isFundAddress(fund),
      width: window.innerWidth,
      hash: location.hash,
      mobileOrigin: env.mobileOrigin,
      auth: status,
      signedIn: Boolean(walletAddress),
    });
    if (d.kind === 'wait') return;
    decided.current = true;
    switch (d.kind) {
      case 'phone':
        // Nothing is imported or cleared: the phone app reads the same fragment
        location.replace(d.url);
        return;
      case 'invalid':
        clearFragment();
        navigate('/', { replace: true });
        return;
      case 'import':
        clearFragment();
        void (async () => {
          if (d.fragment) await importKeyFromFragment(contractKeyStorage, walletAddress!, fund, d.fragment);
          navigate(d.then, { replace: true });
        })();
        return;
      case 'signIn':
        clearFragment();
        if (d.fragment) stashPendingInvite(fund, d.fragment);
        navigate('/sign-in', { replace: true });
    }
  }, [fund, navigate, status, walletAddress]);

  return null;
}

/** After sign-in, imports an invite opened while signed out, then opens that contract */
export function PendingInvite() {
  const { status, walletAddress } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (status !== 'ready' || !walletAddress) return;
    const pending = takePendingInvite();
    if (!pending) return;
    void (async () => {
      await importKeyFromFragment(contractKeyStorage, walletAddress, pending.fund, pending.fragment);
      navigate(`/contract/${pending.fund}`, { replace: true });
    })();
  }, [status, walletAddress, navigate]);
  return null;
}
